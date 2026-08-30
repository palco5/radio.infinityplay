<?php
/**
 * Mapiranje Polar webhook događaja u jedinstven state machine (subscriptions).
 * Polar je merchant of record za kartične pretplate; ovde njegov `status`
 * prevodimo u NAŠ vokabular (trialing/active/pending_payment/past_due/canceling/
 * expired), pa hasAccess() radi isto i za karticu i za fakturu.
 *
 * Čisto (bez baze/HTTP) — da se mapiranje testira izolovano.
 *
 * Polar subscription statusi: active | past_due | paused | canceled | revoked
 * (+ trialing kad postoji probni period). Webhook eventi: subscription.created,
 * subscription.updated, subscription.active, subscription.canceled,
 * subscription.revoked.
 */

namespace Billing;

require_once __DIR__ . '/Subscription.php';

final class PolarMapper
{
    /**
     * @param string $eventType Polar event type
     * @param array  $data      Polar objekat (subscription)
     * @param array  $productMap Polar product id => interni plan ('prod_x' => 'basic-radio')
     * @param \DateTimeImmutable $now
     * @return array|null ['fields'=>[kolone], 'reason'=>str] ili null (ignoriši)
     */
    public static function map(string $eventType, array $data, array $productMap, \DateTimeImmutable $now): ?array
    {
        $periodEnd = self::localDate($data['current_period_end'] ?? null, $now->getTimezone());
        $cancelAtEnd = !empty($data['cancel_at_period_end']);
        $plan = self::planFromData($data, $productMap);
        $status = (string) ($data['status'] ?? '');

        $base = [
            'payment_method'           => 'card',
            'billing_provider'         => 'polar',
            'provider_customer_id'     => $data['customer_id'] ?? null,
            'provider_subscription_id' => $data['id'] ?? null,
        ];
        if ($plan !== null) {
            $base['plan'] = $plan;
        }

        switch ($eventType) {
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.active':
                if ($status === 'trialing') {
                    return self::result($base, [
                        'state'         => Subscription::TRIALING,
                        'trial_ends_at' => $periodEnd,
                    ], 'Polar: probni period');
                }
                if ($status === 'past_due' || $status === 'paused') {
                    return self::result($base, ['state' => Subscription::PAST_DUE], 'Polar: ' . $status);
                }
                if ($status === 'canceled' || $status === 'revoked') {
                    return self::result($base, [
                        'state'                => self::endedState($periodEnd, $now, $status),
                        'cancel_at_period_end' => 1,
                        'current_period_end'   => $periodEnd,
                    ], 'Polar: ' . $status);
                }
                // active
                return self::result($base, [
                    'state'                => $cancelAtEnd ? Subscription::CANCELING : Subscription::ACTIVE,
                    'current_period_end'   => $periodEnd,
                    'cancel_at_period_end' => $cancelAtEnd ? 1 : 0,
                ], $cancelAtEnd ? 'Polar: aktivna, otkazivanje na kraju perioda' : 'Polar: aktivna');

            case 'subscription.canceled':
                // Otkazana ali važi do kraja perioda (cancel_at_period_end).
                return self::result($base, [
                    'state'                => self::endedState($periodEnd, $now, 'canceled'),
                    'cancel_at_period_end' => 1,
                    'current_period_end'   => $periodEnd,
                ], 'Polar: otkazana');

            case 'subscription.revoked':
                // Pristup oduzet odmah (kraj pretplate).
                return self::result($base, [
                    'state'                => Subscription::EXPIRED,
                    'cancel_at_period_end' => 1,
                    'current_period_end'   => $periodEnd,
                ], 'Polar: pristup oduzet');

            default:
                return null; // order.created / checkout.* / customer.* — ignorišemo
        }
    }

    /** canceled: kraj u budućnosti -> canceling (pristup ostaje); inače/revoked -> expired. */
    private static function endedState(?string $periodEnd, \DateTimeImmutable $now, string $status): string
    {
        if ($status === 'revoked' || $periodEnd === null) {
            return Subscription::EXPIRED;
        }
        return (new \DateTimeImmutable($periodEnd, $now->getTimezone())) > $now
            ? Subscription::CANCELING
            : Subscription::EXPIRED;
    }

    /** Polar šalje ISO 8601 (UTC). Skladištimo kao lokalno (Europe/Belgrade) vreme. */
    private static function localDate(?string $iso, \DateTimeZone $tz): ?string
    {
        if (!$iso) {
            return null;
        }
        try {
            return (new \DateTimeImmutable($iso))->setTimezone($tz)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private static function planFromData(array $data, array $productMap): ?string
    {
        $productId = $data['product_id'] ?? ($data['product']['id'] ?? null);
        return $productId !== null ? ($productMap[$productId] ?? null) : null;
    }

    private static function result(array $base, array $fields, string $reason): array
    {
        return ['fields' => array_merge($base, $fields), 'reason' => $reason];
    }
}
