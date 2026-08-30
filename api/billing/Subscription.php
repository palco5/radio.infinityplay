<?php
/**
 * Jedinstven state machine za pretplatu — pokriva i karticu (Polar) i plaćanje
 * po fakturi. Ovo je JEDINI izvor istine o tome da li stream radi (hasAccess).
 *
 * Namerno je BEZ zavisnosti od baze: sve metode su čiste funkcije nad nizom koji
 * predstavlja jedan red iz tabele `subscriptions`. Repo sloj (BillingRepo) uzima
 * rezultat `apply()` i upisuje ga; UI i stream gating zovu `hasAccess()`.
 *
 * Stanja:
 *   trialing         -> pristup ima, do trial_ends_at
 *   active           -> pristup ima, do current_period_end
 *   pending_payment  -> pristup ima, do access_until (3 dana) — faktura poslata, čeka se uplata
 *   past_due         -> pristup NEMA, čeka se uplata
 *   canceling        -> pristup ima do current_period_end, obnove nema
 *   expired          -> pristup NEMA
 */

namespace Billing;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

final class Subscription
{
    public const TZ = 'Europe/Belgrade';

    // Stanja
    public const TRIALING        = 'trialing';
    public const ACTIVE          = 'active';
    public const PENDING_PAYMENT = 'pending_payment';
    public const PAST_DUE        = 'past_due';
    public const CANCELING       = 'canceling';
    public const EXPIRED         = 'expired';

    // Događaji (prelazi)
    public const EV_INVOICE_SENT          = 'invoice_sent';           // faktura poslata (checkout firma)
    public const EV_CARD_PAYMENT_SUCCESS  = 'card_payment_success';   // kartica: aktivacija/naplata
    public const EV_PAYMENT_MATCHED       = 'payment_matched';        // uplata uparena sa izvoda
    public const EV_ACCESS_EXPIRED        = 'access_until_expired';   // istekao 3-dnevni grace
    public const EV_RENEWAL_UNPAID        = 'renewal_unpaid_at_due';  // faktura za novi period neplaćena o dospeću
    public const EV_TRIAL_EXPIRED         = 'trial_expired';          // istekao probni period bez konverzije
    public const EV_USER_CANCELED         = 'user_canceled';          // korisnik otkazao
    public const EV_PERIOD_END            = 'period_end_reached';     // istekao current_period_end (posle cancela)
    public const EV_REACTIVATE            = 'reactivate';             // reaktivacija dok period još traje
    public const EV_PROVIDER_PAST_DUE     = 'provider_past_due';      // kartica: provajder iscrpeo retry-je

    public const GRACE_DAYS = 3;

    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(self::TZ));
    }

    /**
     * Jedini izvor istine: da li stream radi za ovu pretplatu.
     * Vremenski je svestan — ako je access_until/period_end prošao a cron još
     * nije prebacio stanje, pristup se ipak gasi (i obrnuto se ne otvara).
     */
    public static function hasAccess(array $sub, ?DateTimeImmutable $now = null): bool
    {
        $now = $now ?? self::now();
        switch ($sub['state'] ?? null) {
            case self::TRIALING:
                return self::before($now, $sub['trial_ends_at'] ?? null);
            case self::ACTIVE:
            case self::CANCELING:
                return self::before($now, $sub['current_period_end'] ?? null);
            case self::PENDING_PAYMENT:
                return self::before($now, $sub['access_until'] ?? null);
            case self::PAST_DUE:
            case self::EXPIRED:
            default:
                return false;
        }
    }

    /**
     * Primeni događaj na pretplatu. Vraća:
     *   ['changes' => [polja koja se menjaju], 'reason' => tekst, 'noop' => bool]
     * `changes` su spremni za UPDATE (datumi kao 'Y-m-d H:i:s' / 'Y-m-d').
     *
     * Idempotentno: ponovljeni „potvrđujući" događaj koji vodi u isto stanje
     * vraća noop (dupli webhook / dupli cron ne ruše ništa). Nemoguć prelaz baca
     * InvalidTransitionException.
     *
     * @param array $ctx opcioni kontekst: current_period_end, payment_method,
     *                   provider_customer_id, provider_subscription_id, itd.
     */
    public static function apply(array $sub, string $event, array $ctx = [], ?DateTimeImmutable $now = null): array
    {
        $now   = $now ?? self::now();
        $state = $sub['state'] ?? null;
        if ($state === null) {
            throw new InvalidArgumentException('subscription.state nije postavljen');
        }
        $ciklus = $ctx['ciklus'] ?? ($sub['ciklus'] ?? 'godisnje');

        switch ($event) {
            // ── Faktura poslata (checkout firma, iz trial) ──────────────────
            case self::EV_INVOICE_SENT:
                if ($state === self::PENDING_PAYMENT) {
                    return self::noop('faktura već poslata (pending_payment)');
                }
                self::assert(in_array($state, [self::TRIALING, self::EXPIRED], true), $state, $event);
                $periodEnd = self::cycleEnd($now, $ciklus);
                return self::change([
                    'state'                => self::PENDING_PAYMENT,
                    'payment_method'       => 'faktura',
                    'current_period_start' => self::dt($now),
                    'current_period_end'   => self::dt($periodEnd),
                    'access_until'         => self::dt($now->modify('+' . self::GRACE_DAYS . ' days')),
                    'next_billing_date'    => self::d($periodEnd),
                ], 'faktura poslata — pristup otključan na ' . self::GRACE_DAYS . ' dana');

            // ── Kartica (Polar) uspešna (aktivacija/naplata) ─────────────────
            case self::EV_CARD_PAYMENT_SUCCESS:
                $periodEnd = isset($ctx['current_period_end'])
                    ? self::parse($ctx['current_period_end'])
                    : self::cycleEnd($now, $ciklus);
                if ($state === self::ACTIVE) {
                    // Dupli webhook / obnova: samo sinhronizuj kraj perioda.
                    return self::change([
                        'current_period_end' => self::dt($periodEnd),
                        'access_until'       => null,
                    ], 'kartica: sinhronizacija perioda', true);
                }
                return self::change([
                    'state'                => self::ACTIVE,
                    'payment_method'       => 'card',
                    'current_period_start' => self::dt($now),
                    'current_period_end'   => self::dt($periodEnd),
                    'access_until'         => null,
                    'cancel_at_period_end' => 0,
                ], 'kartično plaćanje uspešno');

            // ── Uplata uparena sa izvoda ────────────────────────────────────
            case self::EV_PAYMENT_MATCHED:
                if ($state === self::ACTIVE) {
                    return self::noop('uplata uparena — već active');
                }
                self::assert(in_array($state, [self::PENDING_PAYMENT, self::PAST_DUE], true), $state, $event);
                $changes = [
                    'state'        => self::ACTIVE,
                    'access_until' => null,
                ];
                // Ako je period već prošao (kasna uplata), pomeri ga od sada.
                if (!self::before($now, $sub['current_period_end'] ?? null)) {
                    $periodEnd = self::cycleEnd($now, $ciklus);
                    $changes['current_period_start'] = self::dt($now);
                    $changes['current_period_end']   = self::dt($periodEnd);
                    $changes['next_billing_date']    = self::d($periodEnd);
                }
                return self::change($changes, 'uplata uparena sa izvoda');

            // ── Istekao 3-dnevni grace (pending_payment -> past_due) ────────
            case self::EV_ACCESS_EXPIRED:
                if ($state === self::PAST_DUE) {
                    return self::noop('grace već istekao (past_due)');
                }
                self::assert($state === self::PENDING_PAYMENT, $state, $event);
                return self::change(['state' => self::PAST_DUE], 'istekao grace (access_until) — pristup ugašen');

            // ── Faktura za novi period neplaćena o dospeću (active -> pending) ─
            case self::EV_RENEWAL_UNPAID:
                if ($state === self::PENDING_PAYMENT) {
                    return self::noop('obnova: već pending_payment');
                }
                self::assert($state === self::ACTIVE, $state, $event);
                $periodEnd = self::cycleEnd($now, $ciklus);
                return self::change([
                    'state'                => self::PENDING_PAYMENT,
                    'current_period_start' => self::dt($now),
                    'current_period_end'   => self::dt($periodEnd),
                    'access_until'         => self::dt($now->modify('+' . self::GRACE_DAYS . ' days')),
                    'next_billing_date'    => self::d($periodEnd),
                ], 'faktura za novi period neplaćena o dospeću');

            // ── Istekao probni period bez konverzije ────────────────────────
            case self::EV_TRIAL_EXPIRED:
                if ($state === self::EXPIRED) {
                    return self::noop('trial već istekao (expired)');
                }
                self::assert($state === self::TRIALING, $state, $event);
                return self::change(['state' => self::EXPIRED], 'probni period istekao bez pretplate');

            // ── Korisnik otkazao (zadržava pristup do kraja perioda) ────────
            case self::EV_USER_CANCELED:
                if ($state === self::CANCELING) {
                    return self::noop('već u otkazivanju (canceling)');
                }
                self::assert(in_array($state, [self::ACTIVE, self::PENDING_PAYMENT, self::TRIALING], true), $state, $event);
                return self::change([
                    'state'                => self::CANCELING,
                    'cancel_at_period_end' => 1,
                    'canceled_at'          => self::dt($now),
                ], 'korisnik otkazao — pristup do kraja perioda');

            // ── Reaktivacija dok period još traje (canceling -> active) ─────
            case self::EV_REACTIVATE:
                if ($state === self::ACTIVE) {
                    return self::noop('već aktivna');
                }
                self::assert($state === self::CANCELING, $state, $event);
                if (!self::before($now, $sub['current_period_end'] ?? null)) {
                    throw new InvalidTransitionException(
                        'Period je istekao — reaktivacija ide preko novog checkout-a, ne kroz reactivate.'
                    );
                }
                return self::change([
                    'state'                => self::ACTIVE,
                    'cancel_at_period_end' => 0,
                    'canceled_at'          => null,
                ], 'reaktivacija u toku perioda');

            // ── Istekao period nakon otkazivanja (canceling -> expired) ─────
            case self::EV_PERIOD_END:
                if ($state === self::EXPIRED) {
                    return self::noop('već expired');
                }
                self::assert($state === self::CANCELING, $state, $event);
                return self::change(['state' => self::EXPIRED], 'istekao period nakon otkazivanja');

            // ── Provajder iscrpeo retry-je (past_due) ──────────────────────────
            case self::EV_PROVIDER_PAST_DUE:
                if ($state === self::PAST_DUE) {
                    return self::noop('već past_due');
                }
                self::assert(in_array($state, [self::ACTIVE, self::CANCELING, self::PENDING_PAYMENT], true), $state, $event);
                return self::change(['state' => self::PAST_DUE], 'kartica: naplata neuspešna posle retry-ja');

            default:
                throw new InvalidArgumentException("Nepoznat događaj: {$event}");
        }
    }

    /** Kraj perioda za dati početak i ciklus (mesecno = +1 mesec, godisnje = +1 godina). */
    public static function cycleEnd(DateTimeImmutable $start, string $ciklus): DateTimeImmutable
    {
        return $ciklus === 'mesecno'
            ? $start->modify('+1 month')
            : $start->modify('+1 year');
    }

    // ── interni helperi ─────────────────────────────────────────────────────

    private static function change(array $changes, string $reason, bool $noop = false): array
    {
        return ['changes' => $changes, 'reason' => $reason, 'noop' => $noop];
    }

    private static function noop(string $reason): array
    {
        return ['changes' => [], 'reason' => $reason, 'noop' => true];
    }

    private static function assert(bool $ok, ?string $state, string $event): void
    {
        if (!$ok) {
            throw new InvalidTransitionException("Nedozvoljen prelaz: '{$event}' iz stanja '{$state}'.");
        }
    }

    /** now < ts (ts kao string/DateTimeImmutable/null; null => nema roka => false). */
    private static function before(DateTimeImmutable $now, $ts): bool
    {
        if ($ts === null || $ts === '') {
            return false;
        }
        return $now < self::parse($ts);
    }

    private static function parse($ts): DateTimeImmutable
    {
        if ($ts instanceof DateTimeImmutable) {
            return $ts;
        }
        // MySQL "YYYY-MM-DD HH:MM:SS" i ISO oba prolaze; tumačimo u Europe/Belgrade.
        return new DateTimeImmutable((string) $ts, new DateTimeZone(self::TZ));
    }

    private static function dt(DateTimeImmutable $d): string
    {
        return $d->format('Y-m-d H:i:s');
    }

    private static function d(DateTimeImmutable $d): string
    {
        return $d->format('Y-m-d');
    }
}

class InvalidTransitionException extends \RuntimeException {}
