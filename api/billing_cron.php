<?php
/**
 * Dnevni billing cron: obnova faktura-pretplata + degradacija + podsetnici.
 * Na Loopiji ga okida URL-cron jednom dnevno:
 *   https://radio.infinityplay.rs/api/billing_cron.php?token=...
 * Radi i iz CLI-ja:  php api/billing_cron.php  (opciono --date=YYYY-MM-DD za test).
 *
 * Logika obnove (faktura):
 *   E = current_period_end (= next_billing_date). Lead = BILLING_RENEWAL_LEAD_DANI (7).
 *   • E - lead: generiši fakturu za naredni period, rok plaćanja = E, izdaj (queue)
 *   • plaćena pre E: prelaz active + pomeren period (radi bank-reconciliation, Korak 7)
 *   • nije plaćena na E: active -> pending_payment (+3 dana pristupa)
 *   • istekao access_until: pending_payment -> past_due (stream se gasi)
 *   • trialing istekao: -> expired
 * Jedna loša pretplata ne obara ceo posao (izoluje se u try/catch).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/bootstrap.php';
require_once __DIR__ . '/billing/Subscription.php';
require_once __DIR__ . '/billing/BillingService.php';
require_once __DIR__ . '/billing/BankReconciliation.php';

use Billing\Subscription;
use Billing\BillingService;
use Billing\BillingRepo;
use Billing\BankReconciliation;

date_default_timezone_set(Subscription::TZ);

$isCli = (PHP_SAPI === 'cli');

if (!$isCli) {
    header('Content-Type: application/json');
    $token = $_GET['token'] ?? '';
    if (!defined('BILLING_CRON_TOKEN') || BILLING_CRON_TOKEN === '' || !hash_equals(BILLING_CRON_TOKEN, (string) $token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
}

// Test override datuma (samo CLI) — da se obnova/dunning provere bez čekanja.
$dateOverride = null;
if ($isCli) {
    foreach ($argv as $arg) {
        if (strpos($arg, '--date=') === 0) {
            $dateOverride = substr($arg, strlen('--date='));
        }
    }
}
$now = $dateOverride
    ? new DateTimeImmutable($dateOverride . ' 06:00:00', new DateTimeZone(Subscription::TZ))
    : Subscription::now();
$today = $now->format('Y-m-d');
$nowDt = $now->format('Y-m-d H:i:s');

['repo' => $repo, 'service' => $service] = makeBillingService();

$leadDays = defined('BILLING_RENEWAL_LEAD_DANI') ? (int) BILLING_RENEWAL_LEAD_DANI : 7;
$rokDana  = defined('BILLING_ROK_PLACANJA_DANA') ? (int) BILLING_ROK_PLACANJA_DANA : 5;

$log = ['date' => $today, 'renewals_issued' => 0, 'to_pending' => 0, 'to_past_due' => 0, 'to_expired' => 0, 'reminders' => 0, 'reconciliation' => null, 'errors' => []];

// ── 0) UVOZ IZVODA (camt.053) + uparivanje uplata ───────────────────────────
// Prvo uparimo uplate: ako je neko platio, obnova/dunning niže ga neće dirati.
$stmtDir = defined('BILLING_STATEMENTS_DIR') ? BILLING_STATEMENTS_DIR : '';
if ($stmtDir !== '' && is_dir($stmtDir)) {
    $recon = new BankReconciliation($repo);
    $totals = ['matched' => 0, 'partial' => 0, 'unmatched' => 0, 'files' => 0];
    $doneDir = rtrim($stmtDir, '/') . '/done';
    if (!is_dir($doneDir)) { @mkdir($doneDir, 0770, true); }

    foreach (glob(rtrim($stmtDir, '/') . '/*.xml') as $file) {
        try {
            $txs = BankReconciliation::parseCamt053(file_get_contents($file));
            $r = $recon->reconcile($txs, function ($invoice, $tx) use ($repo) {
                mirrorProfiles($repo, $repo->getSubscription($invoice['subscription_id'])['user_id']);
            });
            $totals['matched'] += $r['matched'];
            $totals['partial'] += $r['partial'];
            $totals['unmatched'] += $r['unmatched'];
            $totals['files']++;
            @rename($file, $doneDir . '/' . basename($file));
        } catch (\Throwable $e) {
            $log['errors'][] = 'reconcile ' . basename($file) . ': ' . $e->getMessage();
        }
    }
    $log['reconciliation'] = $totals;
}

// ── 1) OBNOVA: generiši fakturu za naredni period E - lead dana unapred ──────
foreach ($repo->subsForRenewal($today, $leadDays) as $sub) {
    try {
        // Period narednog ciklusa počinje na E (kraj tekućeg).
        $periodStart = new DateTimeImmutable($sub['current_period_end'], new DateTimeZone(Subscription::TZ));
        $period = BillingService::buildPeriod($periodStart, $sub['ciklus'], $rokDana);
        // Rok plaćanja za obnovu = dan isteka tekućeg perioda (E), ne +rok.
        $period['dueDate'] = $periodStart->format('Y-m-d');

        $invoiceId = $service->createInvoiceForSubscription($sub, $period);
        $inv = $repo->getInvoice($invoiceId);
        // Izdaj samo ako još nije (idempotentno na nivou perioda).
        if ($inv && $inv['status'] === 'draft') {
            $repo->enqueueJob('issue_invoice', ['invoice_id' => $invoiceId]);
            $repo->logEvent($sub['id'], $invoiceId, 'renewal_invoice_created', 'obnova: faktura za naredni period', ['period' => $period['key']]);
            $log['renewals_issued']++;
        }
    } catch (\Throwable $e) {
        $log['errors'][] = "renewal {$sub['id']}: " . $e->getMessage();
        $repo->logEvent($sub['id'], null, 'billing_error', 'obnova', ['error' => $e->getMessage()]);
    }
}

// ── 2) DOSPELA OBNOVA neplaćena: active -> pending_payment (+3 dana) ─────────
foreach ($repo->subsRenewalDue($today) as $sub) {
    try {
        $repo->applyEvent($sub['id'], Subscription::EV_RENEWAL_UNPAID, ['ciklus' => $sub['ciklus']], $now);
        mirrorProfiles($repo, $sub['user_id']);
        $log['to_pending']++;
    } catch (\Throwable $e) {
        $log['errors'][] = "renewal_due {$sub['id']}: " . $e->getMessage();
    }
}

// ── 3) Istekao grace (access_until): pending_payment -> past_due ─────────────
foreach ($repo->subsExpired(Subscription::PENDING_PAYMENT, 'access_until', $nowDt) as $sub) {
    try {
        $repo->applyEvent($sub['id'], Subscription::EV_ACCESS_EXPIRED, [], $now);
        mirrorProfiles($repo, $sub['user_id']);
        $log['to_past_due']++;
    } catch (\Throwable $e) {
        $log['errors'][] = "grace {$sub['id']}: " . $e->getMessage();
    }
}

// ── 4) Otkazana pretplata: canceling -> expired kad prođe period ────────────
foreach ($repo->subsExpired(Subscription::CANCELING, 'current_period_end', $nowDt) as $sub) {
    try {
        $repo->applyEvent($sub['id'], Subscription::EV_PERIOD_END, [], $now);
        mirrorProfiles($repo, $sub['user_id']);
        $log['to_expired']++;
    } catch (\Throwable $e) {
        $log['errors'][] = "cancel_expire {$sub['id']}: " . $e->getMessage();
    }
}

// ── 5) Istekao probni period bez konverzije: trialing -> expired ────────────
foreach ($repo->subsExpired(Subscription::TRIALING, 'trial_ends_at', $nowDt) as $sub) {
    try {
        $repo->applyEvent($sub['id'], Subscription::EV_TRIAL_EXPIRED, [], $now);
        mirrorProfiles($repo, $sub['user_id']);
        $log['to_expired']++;
    } catch (\Throwable $e) {
        $log['errors'][] = "trial_expire {$sub['id']}: " . $e->getMessage();
    }
}

// ── 6) PODSETNICI: 3 dana pre dospeća, na dan dospeća, na dan gašenja ───────
foreach ($repo->openInvoices() as $inv) {
    try {
        $valuta = new DateTimeImmutable($inv['datum_valute'], new DateTimeZone(Subscription::TZ));
        $daysToDue = (int) $now->setTime(0, 0)->diff($valuta->setTime(0, 0))->format('%r%a');

        $phase = null;
        if ($daysToDue === 3)       $phase = 'pre_3';       // 3 dana pre dospeća
        elseif ($daysToDue === 0)   $phase = 'na_dospece';  // na dan dospeća
        // dan gašenja: access_until (dospeće + grace) je danas
        $sub = $repo->getSubscription($inv['subscription_id']);
        if ($sub && $sub['state'] === Subscription::PENDING_PAYMENT && !empty($sub['access_until'])) {
            $access = new DateTimeImmutable($sub['access_until'], new DateTimeZone(Subscription::TZ));
            if ($access->format('Y-m-d') === $today) {
                $phase = 'gasenje';
            }
        }

        if ($phase && !$repo->reminderSent((int) $inv['id'], $phase)) {
            if (sendReminder($repo, $inv, $phase)) {
                $repo->logEvent($inv['subscription_id'], (int) $inv['id'], 'reminder_sent', $phase, ['days_to_due' => $daysToDue]);
                $log['reminders']++;
            }
        }
    } catch (\Throwable $e) {
        $log['errors'][] = "reminder {$inv['id']}: " . $e->getMessage();
    }
}

if ($isCli) {
    fwrite(STDOUT, json_encode($log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
} else {
    echo json_encode($log, JSON_UNESCAPED_UNICODE);
}

// ─────────────────────────────────────────────────────────────────────────────

/** Osveži legacy profiles status iz svežeg stanja pretplate. */
function mirrorProfiles(BillingRepo $repo, string $userId): void
{
    $sub = $repo->getSubscriptionByUser($userId);
    if (!$sub) return;
    $db = $repo->pdo();

    switch ($sub['state']) {
        case Subscription::TRIALING:        $status = 'trial';    $ends = $sub['trial_ends_at']; break;
        case Subscription::ACTIVE:
        case Subscription::CANCELING:       $status = 'active';   $ends = $sub['current_period_end']; break;
        case Subscription::PENDING_PAYMENT: $status = 'active';   $ends = $sub['access_until']; break;
        case Subscription::PAST_DUE:        $status = 'past_due'; $ends = $sub['current_period_end']; break;
        default:                            $status = 'expired';  $ends = $sub['current_period_end']; break;
    }
    $db->prepare('UPDATE profiles SET subscription_status = ?, subscription_ends_at = ? WHERE id = ?')
        ->execute([$status, $ends, $userId]);
}

/** Pošalji podsetnik mejlom preko postojećeg SMTP-a (dryrun poštuje BILLING_EMAIL_DRYRUN). */
function sendReminder(BillingRepo $repo, array $inv, string $phase): bool
{
    $client = $repo->getClient($inv['client_id']);
    if (!$client) return false;

    $iznos = number_format((float) $inv['ukupno'], 2, ',', '.');
    $valuta = date('d.m.Y.', strtotime($inv['datum_valute']));
    $pnb = $inv['poziv_na_broj'];

    $texts = [
        'pre_3' => [
            "Podsetnik: faktura {$inv['broj_fakture']} dospeva za 3 dana",
            "Poštovani,<br><br>Faktura <strong>{$inv['broj_fakture']}</strong> na iznos <strong>{$iznos} RSD</strong> dospeva {$valuta}.<br>Poziv na broj: <strong>{$pnb}</strong>",
        ],
        'na_dospece' => [
            "Faktura {$inv['broj_fakture']} dospeva danas",
            "Poštovani,<br><br>Faktura <strong>{$inv['broj_fakture']}</strong> ({$iznos} RSD) dospeva danas.<br>Poziv na broj: <strong>{$pnb}</strong><br><br>Ako ste već uplatili, zanemarite ovaj mejl.",
        ],
        'gasenje' => [
            "Poslednji dan pristupa — faktura {$inv['broj_fakture']}",
            "Poštovani,<br><br>Faktura <strong>{$inv['broj_fakture']}</strong> ({$iznos} RSD) još nije evidentirana kao plaćena. Pristup vam ističe danas.<br>Poziv na broj: <strong>{$pnb}</strong><br><br>Čim uplata bude vidljiva, pristup se vraća automatski.",
        ],
    ];
    if (!isset($texts[$phase])) return false;
    [$subject, $html] = $texts[$phase];

    if (defined('BILLING_EMAIL_DRYRUN') && BILLING_EMAIL_DRYRUN) {
        error_log("[billing_cron] DRYRUN podsetnik ({$phase}) -> {$client['email']}: {$subject}");
        return true;
    }
    if (function_exists('sendAppMail')) {
        return (bool) sendAppMail($client['email'], $subject, $html);
    }
    return false;
}
