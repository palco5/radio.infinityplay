<?php
/**
 * Worker koji obrađuje billing_jobs (queue). Na Loopiji ga okida URL-cron
 * (svakih 5 min): https://radio.infinityplay.rs/api/billing_worker.php?token=...
 * Može i iz CLI-ja: php api/billing_worker.php
 *
 * Trenutno obrađuje `issue_invoice`: kreira fakturu za pretplatu, šalje na SEF
 * (uz fallback) i mejlom. Korisnik NE čeka ovo — pristup je već otključan na
 * checkout-u. Jedan loš posao ne ruši ostale (izoluje se u try/catch).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/bootstrap.php';
require_once __DIR__ . '/billing/Subscription.php';

use Billing\Subscription;
use Billing\BillingService;

date_default_timezone_set(Subscription::TZ);

$isCli = (PHP_SAPI === 'cli');

// Zaštita HTTP okidanja: bez ispravnog tokena, ne pokreći (da javnost ne okida worker).
if (!$isCli) {
    header('Content-Type: application/json');
    $token = $_GET['token'] ?? '';
    if (!defined('BILLING_CRON_TOKEN') || BILLING_CRON_TOKEN === '' || !hash_equals(BILLING_CRON_TOKEN, (string) $token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
}

['repo' => $repo, 'service' => $service] = makeBillingService();

$workerId = gethostname() . '-' . getmypid();
$jobs = $repo->claimJobs($workerId, 20);

$processed = 0;
$failed = 0;
$results = [];

foreach ($jobs as $job) {
    $id = (int) $job['id'];
    try {
        handleJob($repo, $service, $job);
        $repo->completeJob($id);
        $processed++;
        $results[] = ['id' => $id, 'type' => $job['type'], 'status' => 'done'];
    } catch (\Throwable $e) {
        $repo->failJob($id, $e->getMessage(), (int) $job['attempts'], (int) $job['max_attempts']);
        $failed++;
        $results[] = ['id' => $id, 'type' => $job['type'], 'status' => 'failed', 'error' => $e->getMessage()];
        error_log("[billing_worker] job {$id} ({$job['type']}) neuspeh: " . $e->getMessage());
    }
}

$summary = ['claimed' => count($jobs), 'processed' => $processed, 'failed' => $failed, 'results' => $results];

if ($isCli) {
    fwrite(STDOUT, json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
} else {
    echo json_encode($summary, JSON_UNESCAPED_UNICODE);
}

/** Obrada jednog posla. */
function handleJob(\Billing\BillingRepo $repo, BillingService $service, array $job): void
{
    $payload = is_string($job['payload']) ? json_decode($job['payload'], true) : ($job['payload'] ?? []);

    switch ($job['type']) {
        case 'issue_invoice':
            // Već kreirana faktura (npr. obnova iz crona): samo je izdaj.
            if (!empty($payload['invoice_id'])) {
                $service->issueInvoice((int) $payload['invoice_id']);
                break;
            }
            $subId = $payload['subscription_id'] ?? null;
            if (!$subId) {
                throw new \RuntimeException('issue_invoice bez subscription_id/invoice_id');
            }
            $sub = $repo->getSubscription($subId);
            if (!$sub) {
                throw new \RuntimeException("Pretplata ne postoji: {$subId}");
            }

            $startStr = $sub['current_period_start'] ?: 'now';
            $start = new \DateTimeImmutable($startStr, new \DateTimeZone(Subscription::TZ));
            $rok = (int) (defined('BILLING_ROK_PLACANJA_DANA') ? BILLING_ROK_PLACANJA_DANA : 5);
            $period = BillingService::buildPeriod($start, $sub['ciklus'], $rok);

            $invoiceId = $service->createInvoiceForSubscription($sub, $period);
            $service->issueInvoice($invoiceId);
            break;

        default:
            throw new \RuntimeException("Nepoznat tip posla: {$job['type']}");
    }
}
