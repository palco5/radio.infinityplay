<?php
/**
 * DB sloj za billing (MariaDB, PDO). Konekcija se injektuje kroz konstruktor
 * (u produkciji `getDB()` iz config.php, u testovima lokalna baza) — tako je
 * repo testabilan bez živog sajta.
 *
 * Ovde su i DB-nivo garancije koje state machine sam ne može da obezbedi:
 *  - nextInvoiceSequence(): atomičan brojač bez rupa (LAST_INSERT_ID pattern)
 *  - recordWebhookEvent(): idempotencija webhook-a (PK na event_id)
 *  - unique (subscription_id, period_key) na invoices: zaštita od duplog crona
 */

namespace Billing;

use PDO;

require_once __DIR__ . '/Subscription.php';

final class BillingRepo
{
    /** Kolone subscriptions koje `apply()` sme da menja. */
    private const SUB_WRITABLE = [
        'state', 'payment_method', 'current_period_start', 'current_period_end',
        'access_until', 'next_billing_date', 'cancel_at_period_end', 'canceled_at',
        'provider_customer_id', 'provider_subscription_id', 'billing_provider',
    ];

    public function __construct(private PDO $db)
    {
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    public function pdo(): PDO
    {
        return $this->db;
    }

    // ── Sekvenca za brojeve faktura ─────────────────────────────────────────
    /**
     * Sledeći redni broj fakture za godinu — atomično, bez rupa, bezbedno i kad
     * dve konekcije istovremeno traže broj. LAST_INSERT_ID(expr) postavlja
     * sesijsku vrednost unutar samog INSERT-a, pa nema race-a između naredbi.
     */
    public function nextInvoiceSequence(int $year): int
    {
        $this->db->prepare(
            'INSERT INTO invoice_counters (year, last_seq) VALUES (:y, LAST_INSERT_ID(1))
             ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)'
        )->execute([':y' => $year]);

        return (int) $this->db->query('SELECT LAST_INSERT_ID()')->fetchColumn();
    }

    // ── Webhook idempotencija ────────────────────────────────────────────────
    /**
     * Zabeleži da je webhook događaj obrađen. Vraća true ako je OVO prvo viđenje
     * (treba ga obraditi), false ako je već obrađen (dupli webhook — preskoči).
     */
    public function recordWebhookEvent(string $eventId, string $eventType, ?array $payload = null): bool
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO webhook_events (event_id, event_type, payload)
             VALUES (:id, :type, :payload)'
        );
        $stmt->execute([
            ':id'      => $eventId,
            ':type'    => $eventType,
            ':payload' => $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
        ]);
        return $stmt->rowCount() === 1;
    }

    // ── Pretplate ───────────────────────────────────────────────────────────
    public function getSubscription(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM subscriptions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getSubscriptionByUser(string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM subscriptions WHERE user_id = :u ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([':u' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Kolone koje provajder (kartica) sync sme da postavi. */
    private const SUB_PROVIDER_WRITABLE = [
        'state', 'payment_method', 'current_period_end', 'trial_ends_at',
        'cancel_at_period_end', 'provider_customer_id', 'provider_subscription_id', 'billing_provider', 'plan',
    ];

    private function uuid(): string
    {
        if (function_exists('generateUUID')) {
            return \generateUUID();
        }
        $d = random_bytes(16);
        $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
        $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
    }

    /**
     * Upsert pretplate iz provajdera (kartica, npr. Polar) u jedinstven model. Provajder je izvor
     * istine za kartične pretplate, pa stanje postavljamo autoritativno (mapirano
     * u naš vokabular). Loguje billing_event. Vraća svež red pretplate.
     */
    public function syncProviderSubscription(string $userId, array $fields, string $reason): array
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM subscriptions WHERE user_id = :u ORDER BY created_at DESC LIMIT 1 FOR UPDATE');
            $stmt->execute([':u' => $userId]);
            $existing = $stmt->fetch();

            $set = array_intersect_key($fields, array_flip(self::SUB_PROVIDER_WRITABLE));

            if ($existing) {
                $subId = $existing['id'];
                if ($set) {
                    $assign = implode(', ', array_map(fn ($c) => "{$c} = :{$c}", array_keys($set)));
                    $params = [':id' => $subId];
                    foreach ($set as $k => $v) { $params[":{$k}"] = $v; }
                    $this->db->prepare("UPDATE subscriptions SET {$assign} WHERE id = :id")->execute($params);
                }
                $fromState = $existing['state'];
            } else {
                $subId = $this->uuid();
                if (empty($set['plan'])) {
                    $set['plan'] = 'basic-radio';
                }
                $set['payment_method'] = $set['payment_method'] ?? 'card';
                $cols = array_merge(['id' => $subId, 'user_id' => $userId], $set);
                $names = implode(', ', array_keys($cols));
                $ph = implode(', ', array_map(fn ($k) => ":{$k}", array_keys($cols)));
                $params = [];
                foreach ($cols as $k => $v) { $params[":{$k}"] = $v; }
                $this->db->prepare("INSERT INTO subscriptions ({$names}) VALUES ({$ph})")->execute($params);
                $fromState = null;
            }

            $this->logEvent($subId, null, 'state_change', $reason, [
                'source' => 'provider_webhook',
                'from'   => $fromState,
                'to'     => $set['state'] ?? $fromState,
            ]);

            $this->db->commit();
            return $this->getSubscription($subId);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Ogledalo stanja pretplate u `profiles` — privremeni most za postojeći
     * frontend (subscription_status/tier/ends). Deli ga webhook i sync-on-return.
     * $sub je red iz subscriptions (rezultat syncProviderSubscription/getSubscription).
     */
    public function mirrorProfiles(string $userId, array $sub): void
    {
        switch ($sub['state']) {
            case Subscription::TRIALING:        $status = 'trial';    $ends = $sub['trial_ends_at']; break;
            case Subscription::ACTIVE:
            case Subscription::CANCELING:       $status = 'active';   $ends = $sub['current_period_end']; break;
            case Subscription::PENDING_PAYMENT: $status = 'active';   $ends = $sub['access_until']; break;
            case Subscription::PAST_DUE:        $status = 'past_due'; $ends = $sub['current_period_end']; break;
            default:                            $status = 'expired';  $ends = $sub['current_period_end']; break;
        }
        $fields = ['subscription_status = ?', 'cancel_at_period_end = ?', 'provider_customer_id = ?', 'provider_subscription_id = ?'];
        $values = [$status, (int) $sub['cancel_at_period_end'], $sub['provider_customer_id'], $sub['provider_subscription_id']];
        if ($sub['state'] === Subscription::TRIALING) {
            $fields[] = 'trial_ends_at = ?';
            $values[] = $ends;
        } else {
            $fields[] = 'subscription_ends_at = ?';
            $values[] = $ends;
        }
        if (!empty($sub['plan'])) {
            $fields[] = 'subscription_tier = ?';
            $values[] = $sub['plan'];
        }
        $values[] = $userId;
        $this->db->prepare('UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
    }

    /**
     * Učitaj pretplatu, primeni događaj kroz state machine, upiši izmene i
     * zabeleži billing_event sa razlogom. Vraća rezultat `Subscription::apply`.
     * Nemoguć prelaz baca InvalidTransitionException (poziv ostaje bez efekta).
     */
    public function applyEvent(string $subscriptionId, string $event, array $ctx = [], ?\DateTimeImmutable $now = null): array
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM subscriptions WHERE id = :id FOR UPDATE');
            $stmt->execute([':id' => $subscriptionId]);
            $sub = $stmt->fetch();
            if (!$sub) {
                throw new \RuntimeException("Pretplata ne postoji: {$subscriptionId}");
            }

            $result = Subscription::apply($sub, $event, $ctx, $now);
            $changes = $result['changes'];

            if ($changes) {
                $set = [];
                $params = [':id' => $subscriptionId];
                foreach ($changes as $col => $val) {
                    if (!in_array($col, self::SUB_WRITABLE, true)) {
                        throw new \LogicException("apply() vratio nepoznatu kolonu: {$col}");
                    }
                    $set[] = "{$col} = :{$col}";
                    $params[":{$col}"] = $val;
                }
                $this->db->prepare(
                    'UPDATE subscriptions SET ' . implode(', ', $set) . ' WHERE id = :id'
                )->execute($params);
            }

            $this->logEvent($subscriptionId, null, 'state_change', $result['reason'], [
                'event'  => $event,
                'from'   => $sub['state'],
                'to'     => $changes['state'] ?? $sub['state'],
                'noop'   => $result['noop'],
            ]);

            $this->db->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ── Fakture ─────────────────────────────────────────────────────────────
    public function findInvoiceByPeriod(string $subscriptionId, string $periodKey): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM invoices WHERE subscription_id = :s AND period_key = :p'
        );
        $stmt->execute([':s' => $subscriptionId, ':p' => $periodKey]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Kreira fakturu. Unique (subscription_id, period_key) sprečava duplu
     * fakturu za isti period (dupli cron) — u tom slučaju baca PDOException
     * sa SQLSTATE 23000; pozivalac to tumači kao „već postoji".
     *
     * @return int id kreirane fakture (= stabilan SEF requestId)
     */
    public function createInvoice(array $inv): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO invoices
              (subscription_id, client_id, broj_fakture, period_key,
               datum_izdavanja, datum_valute, datum_prometa,
               poziv_na_broj, poziv_na_broj_ips,
               osnovica, pdv, ukupno, valuta, stavke, status)
             VALUES
              (:subscription_id, :client_id, :broj_fakture, :period_key,
               :datum_izdavanja, :datum_valute, :datum_prometa,
               :poziv_na_broj, :poziv_na_broj_ips,
               :osnovica, :pdv, :ukupno, :valuta, :stavke, :status)'
        );
        $stmt->execute([
            ':subscription_id'  => $inv['subscription_id'],
            ':client_id'        => $inv['client_id'],
            ':broj_fakture'     => $inv['broj_fakture'],
            ':period_key'       => $inv['period_key'],
            ':datum_izdavanja'  => $inv['datum_izdavanja'],
            ':datum_valute'     => $inv['datum_valute'],
            ':datum_prometa'    => $inv['datum_prometa'],
            ':poziv_na_broj'    => $inv['poziv_na_broj'],
            ':poziv_na_broj_ips'=> $inv['poziv_na_broj_ips'],
            ':osnovica'         => $inv['osnovica'],
            ':pdv'              => $inv['pdv'],
            ':ukupno'           => $inv['ukupno'],
            ':valuta'           => $inv['valuta'] ?? 'RSD',
            ':stavke'           => is_string($inv['stavke']) ? $inv['stavke'] : json_encode($inv['stavke'], JSON_UNESCAPED_UNICODE),
            ':status'           => $inv['status'] ?? 'draft',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getInvoice(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM invoices WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getClient(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM billing_clients WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Istorija faktura za pretplatu (najnovije prvo). */
    public function invoicesForSubscription(string $subscriptionId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, broj_fakture, period_key, datum_izdavanja, datum_valute, ukupno, valuta,
                    status, poziv_na_broj, placeno_datum
             FROM invoices WHERE subscription_id = :s ORDER BY id DESC'
        );
        $stmt->execute([':s' => $subscriptionId]);
        return $stmt->fetchAll();
    }

    /** Najnovija otvorena (neplaćena) faktura za pretplatu — za podatke o uplati. */
    public function latestOpenInvoice(string $subscriptionId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM invoices WHERE subscription_id = :s AND status IN ('sent','sef_failed','draft')
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([':s' => $subscriptionId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function saveInvoiceXml(int $id, string $xml): void
    {
        $this->db->prepare('UPDATE invoices SET ubl_xml = :x WHERE id = :id')
            ->execute([':x' => $xml, ':id' => $id]);
    }

    /** Zabeleži uspešno slanje na SEF. */
    public function markInvoiceSent(int $id, ?string $sefInvoiceId, ?string $sefStatus, $sefResponse): void
    {
        $this->db->prepare(
            "UPDATE invoices SET status='sent', sef_invoice_id=:sid, sef_status=:sst,
                    sef_response=:resp, sent_at=NOW() WHERE id=:id"
        )->execute([
            ':sid'  => $sefInvoiceId,
            ':sst'  => $sefStatus,
            ':resp' => $sefResponse !== null ? json_encode($sefResponse, JSON_UNESCAPED_UNICODE) : null,
            ':id'   => $id,
        ]);
    }

    /** SEF odbio/nedostupan, ali mejl je poslat -> status sef_failed (ne rušimo proces). */
    public function markInvoiceSefFailed(int $id, $sefResponse): void
    {
        $this->db->prepare(
            "UPDATE invoices SET status='sef_failed', sef_response=:resp WHERE id=:id"
        )->execute([
            ':resp' => $sefResponse !== null ? json_encode($sefResponse, JSON_UNESCAPED_UNICODE) : null,
            ':id'   => $id,
        ]);
    }

    public function markInvoiceEmailed(int $id): void
    {
        $this->db->prepare('UPDATE invoices SET email_sent_at = NOW() WHERE id = :id')
            ->execute([':id' => $id]);
    }

    public function updateInvoiceStatus(int $id, string $status): void
    {
        $this->db->prepare('UPDATE invoices SET status = :s WHERE id = :id')
            ->execute([':s' => $status, ':id' => $id]);
    }

    /** SEF odbio jer primalac nije registrovan -> ne pokušavaj SEF za ovog klijenta ubuduće. */
    public function setClientSefRegistered(string $clientId, bool $registered): void
    {
        $this->db->prepare('UPDATE billing_clients SET sef_registered = :r WHERE id = :id')
            ->execute([':r' => $registered ? 1 : 0, ':id' => $clientId]);
    }

    // ── Cron upiti (obnova, dunning, degradacija) ───────────────────────────
    /** Aktivne faktura-pretplate kojima se bliži obnova (E-lead .. E), bez otkazivanja. */
    public function subsForRenewal(string $today, int $leadDays): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM subscriptions
             WHERE state = 'active' AND payment_method = 'faktura' AND cancel_at_period_end = 0
               AND next_billing_date IS NOT NULL
               AND next_billing_date >= :today
               AND next_billing_date <= DATE_ADD(:today2, INTERVAL :lead DAY)"
        );
        $stmt->bindValue(':today', $today);
        $stmt->bindValue(':today2', $today);
        $stmt->bindValue(':lead', $leadDays, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** Aktivne faktura-pretplate kojima je dospeo datum obnove (E danas ili prošlo). */
    public function subsRenewalDue(string $today): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM subscriptions
             WHERE state = 'active' AND payment_method = 'faktura'
               AND next_billing_date IS NOT NULL AND next_billing_date <= :today"
        );
        $stmt->execute([':today' => $today]);
        return $stmt->fetchAll();
    }

    /** Pretplate u datom stanju kojima je prošlo vreme u zadatoj koloni (npr. access_until). */
    public function subsExpired(string $state, string $field, string $nowDt): array
    {
        $allowed = ['access_until', 'current_period_end', 'trial_ends_at'];
        if (!in_array($field, $allowed, true)) {
            throw new \InvalidArgumentException("Nedozvoljena kolona: {$field}");
        }
        $stmt = $this->db->prepare(
            "SELECT * FROM subscriptions WHERE state = :s AND {$field} IS NOT NULL AND {$field} < :now"
        );
        $stmt->execute([':s' => $state, ':now' => $nowDt]);
        return $stmt->fetchAll();
    }

    /** Otvorene (neplaćene) fakture za podsetnike. */
    public function openInvoices(): array
    {
        $stmt = $this->db->query(
            "SELECT * FROM invoices WHERE status IN ('sent','sef_failed') AND placeno_datum IS NULL"
        );
        return $stmt->fetchAll();
    }

    /** Da li je podsetnik date faze već poslat za ovu fakturu (dedup preko billing_events). */
    public function reminderSent(int $invoiceId, string $phase): bool
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM billing_events
             WHERE invoice_id = :i AND type = 'reminder_sent' AND reason = :p"
        );
        $stmt->execute([':i' => $invoiceId, ':p' => $phase]);
        return (int) $stmt->fetchColumn() > 0;
    }

    // ── Queue (billing_jobs) ────────────────────────────────────────────────
    /**
     * Preuzmi do $limit poslova spremnih za obradu i zaključaj ih (status=running).
     * Zaključavanje je atomično po redu (UPDATE ... WHERE status='queued') pa dve
     * paralelne instance ne mogu uzeti isti posao.
     * @return array[] redovi poslova
     */
    public function claimJobs(string $workerId, int $limit = 10): array
    {
        $stmt = $this->db->prepare(
            "SELECT id FROM billing_jobs
             WHERE status = 'queued' AND run_after <= NOW()
             ORDER BY id ASC LIMIT {$limit}"
        );
        $stmt->execute();
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $claimed = [];
        $lock = $this->db->prepare(
            "UPDATE billing_jobs SET status='running', locked_at=NOW(), locked_by=:w, attempts=attempts+1
             WHERE id=:id AND status='queued'"
        );
        $get = $this->db->prepare('SELECT * FROM billing_jobs WHERE id = :id');
        foreach ($ids as $id) {
            $lock->execute([':w' => $workerId, ':id' => $id]);
            if ($lock->rowCount() === 1) {
                $get->execute([':id' => $id]);
                $claimed[] = $get->fetch();
            }
        }
        return $claimed;
    }

    /** Stavi posao u red. */
    public function enqueueJob(string $type, array $payload): int
    {
        $this->db->prepare("INSERT INTO billing_jobs (type, payload) VALUES (:t, :p)")
            ->execute([':t' => $type, ':p' => json_encode($payload, JSON_UNESCAPED_UNICODE)]);
        return (int) $this->db->lastInsertId();
    }

    public function completeJob(int $id): void
    {
        $this->db->prepare("UPDATE billing_jobs SET status='done', locked_at=NULL, locked_by=NULL WHERE id=:id")
            ->execute([':id' => $id]);
    }

    /** Neuspeh: vrati u red sa eksponencijalnim čekanjem, ili 'dead' kad se iscrpe pokušaji. */
    public function failJob(int $id, string $error, int $attempts, int $maxAttempts): void
    {
        if ($attempts >= $maxAttempts) {
            $this->db->prepare("UPDATE billing_jobs SET status='dead', last_error=:e, locked_at=NULL, locked_by=NULL WHERE id=:id")
                ->execute([':e' => $error, ':id' => $id]);
            return;
        }
        $delayMin = 5 * (2 ** max(0, $attempts - 1)); // 5,10,20,40… min
        $this->db->prepare(
            "UPDATE billing_jobs SET status='queued', last_error=:e, locked_at=NULL, locked_by=NULL,
                    run_after = DATE_ADD(NOW(), INTERVAL {$delayMin} MINUTE) WHERE id=:id"
        )->execute([':e' => $error, ':id' => $id]);
    }

    // ── Uparivanje uplata (bank reconciliation) ─────────────────────────────
    /** Nađi otvorenu fakturu po OSNOVI poziva na broj (bez kontrolnih cifara). */
    public function findInvoiceByPozivNaBrojBase(string $base): ?array
    {
        // poziv_na_broj je "KK-baza"; poredimo po delu posle crtice.
        $stmt = $this->db->prepare(
            "SELECT * FROM invoices
             WHERE SUBSTRING_INDEX(poziv_na_broj, '-', -1) = :base
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([':base' => $base]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Zatvori fakturu kao plaćenu. */
    public function markInvoicePaid(int $id, string $datum, $iznos, ?string $izvodRef): void
    {
        $this->db->prepare(
            "UPDATE invoices SET status='paid', placeno_datum=:d, placeno_iznos=:i, izvod_ref=:r WHERE id=:id"
        )->execute([':d' => $datum, ':i' => $iznos, ':r' => $izvodRef, ':id' => $id]);
    }

    /**
     * Ubaci bankovnu transakciju iz izvoda. import_ref je UNIQUE -> dupli uvoz
     * istog izvoda ne pravi duplikate. Vraća true ako je red novoubačen.
     */
    public function insertBankTransaction(array $tx): bool
    {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO bank_transactions (import_ref, datum, iznos, poziv_na_broj, nalogodavac, raw, matched_invoice_id, status)
             VALUES (:ref, :datum, :iznos, :pnb, :nalog, :raw, :mid, :status)"
        );
        $stmt->execute([
            ':ref'    => $tx['import_ref'],
            ':datum'  => $tx['datum'],
            ':iznos'  => $tx['iznos'],
            ':pnb'    => $tx['poziv_na_broj'] ?? null,
            ':nalog'  => $tx['nalogodavac'] ?? null,
            ':raw'    => isset($tx['raw']) ? json_encode($tx['raw'], JSON_UNESCAPED_UNICODE) : null,
            ':mid'    => $tx['matched_invoice_id'] ?? null,
            ':status' => $tx['status'] ?? 'unmatched',
        ]);
        return $stmt->rowCount() === 1;
    }

    public function updateBankTransactionStatus(string $importRef, string $status, ?int $matchedInvoiceId = null): void
    {
        $this->db->prepare(
            "UPDATE bank_transactions SET status=:s, matched_invoice_id=:m WHERE import_ref=:ref"
        )->execute([':s' => $status, ':m' => $matchedInvoiceId, ':ref' => $importRef]);
    }

    // ── Audit ───────────────────────────────────────────────────────────────
    public function logEvent(?string $subscriptionId, ?int $invoiceId, string $type, ?string $reason = null, ?array $payload = null): void
    {
        $this->db->prepare(
            'INSERT INTO billing_events (subscription_id, invoice_id, type, reason, payload)
             VALUES (:s, :i, :t, :r, :p)'
        )->execute([
            ':s' => $subscriptionId,
            ':i' => $invoiceId,
            ':t' => $type,
            ':r' => $reason,
            ':p' => $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
        ]);
    }
}
