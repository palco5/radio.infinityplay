<?php
/**
 * Polar webhook — Standard Webhooks potpis (HMAC-SHA256), idempotencija, i
 * mapiranje Polar subscription događaja u naš jedinstven state machine.
 *
 * Headeri (Standard Webhooks): webhook-id, webhook-timestamp, webhook-signature.
 * Potpisani sadržaj = "{id}.{timestamp}.{raw_body}"; potpis = base64(HMAC-SHA256).
 * Tajni ključ je oblika "whsec_<base64>" — ključ za potpis je base64_decode dela
 * posle "whsec_".
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/BillingRepo.php';
require_once __DIR__ . '/billing/PolarMapper.php';
require_once __DIR__ . '/billing/Subscription.php';

use Billing\BillingRepo;
use Billing\PolarMapper;
use Billing\Subscription;

header('Content-Type: application/json');
date_default_timezone_set(Subscription::TZ);

$rawBody = file_get_contents('php://input');
$wId  = $_SERVER['HTTP_WEBHOOK_ID'] ?? '';
$wTs  = $_SERVER['HTTP_WEBHOOK_TIMESTAMP'] ?? '';
$wSig = $_SERVER['HTTP_WEBHOOK_SIGNATURE'] ?? '';

if (!POLAR_WEBHOOK_SECRET || !verifyPolarSignature($rawBody, $wId, $wTs, $wSig, POLAR_WEBHOOK_SECRET)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($rawBody, true);
if (!is_array($event) || empty($event['type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Malformed payload']);
    exit;
}

$eventType = $event['type'];
$data = $event['data'] ?? [];

$db = getDB();
$repo = new BillingRepo($db);

// Idempotencija: Polar ume da pošalje isti događaj dvaput (webhook-id je stabilan).
$eventId = $wId ?: ($data['id'] ?? null);
if ($eventId) {
    if (!$repo->recordWebhookEvent($eventId, $eventType, $event)) {
        echo json_encode(['success' => true, 'duplicate' => true]);
        exit;
    }
}

try {
    $userId = findUserIdForPolar($data);
    if (!$userId) {
        error_log('Polar webhook: ne mogu da razrešim korisnika za ' . ($data['id'] ?? 'unknown'));
    } else {
        $productMap = [
            POLAR_PRODUCT_BASIC          => 'basic-radio',
            POLAR_PRODUCT_BRANDED        => 'branded-radio',
            POLAR_PRODUCT_HOST           => 'host-radio',
            POLAR_PRODUCT_BASIC_ANNUAL   => 'basic-radio',
            POLAR_PRODUCT_BRANDED_ANNUAL => 'branded-radio',
            POLAR_PRODUCT_HOST_ANNUAL    => 'host-radio',
        ];
        $mapped = PolarMapper::map($eventType, $data, $productMap, Subscription::now());
        if ($mapped !== null) {
            $sub = $repo->syncProviderSubscription($userId, $mapped['fields'], $mapped['reason']);
            $repo->mirrorProfiles($userId, $sub);
        }
    }
} catch (Exception $e) {
    // Vrati 200 svejedno — ne želimo da Polar beskonačno ponavlja payload na kom
    // se naš kod spotiče. Greška je zabeležena.
    error_log('Polar webhook handling failed: ' . $e->getMessage());
}

http_response_code(200);
echo json_encode(['success' => true]);

// ─────────────────────────────────────────────────────────────────────────────

function verifyPolarSignature($body, $id, $ts, $sigHeader, $secret): bool
{
    if (!$body || !$id || !$ts || !$sigHeader) {
        return false;
    }
    // Odbaci prestare timestamp-ove (zaštita od replay-a) — 5 min tolerancija.
    if (abs(time() - (int) $ts) > 300) {
        return false;
    }
    $key = str_starts_with($secret, 'whsec_')
        ? base64_decode(substr($secret, 6))
        : $secret;
    $signed = "{$id}.{$ts}.{$body}";
    $expected = base64_encode(hash_hmac('sha256', $signed, $key, true));

    // Header je razmakom razdvojena lista "v1,<base64sig>".
    foreach (explode(' ', $sigHeader) as $part) {
        $sig = str_contains($part, ',') ? explode(',', $part, 2)[1] : $part;
        if (hash_equals($expected, $sig)) {
            return true;
        }
    }
    return false;
}

/** Nađi korisnika: metadata.user_id sa checkout-a, pa provider_customer_id. */
function findUserIdForPolar($data)
{
    $db = getDB();
    $userId = $data['metadata']['user_id'] ?? ($data['customer']['metadata']['user_id'] ?? null);
    if ($userId) {
        $stmt = $db->prepare('SELECT id FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            return $userId;
        }
    }
    $customerId = $data['customer_id'] ?? ($data['customer']['id'] ?? null);
    if ($customerId) {
        $stmt = $db->prepare('SELECT id FROM profiles WHERE provider_customer_id = ?');
        $stmt->execute([$customerId]);
        $row = $stmt->fetch();
        if ($row) {
            return $row['id'];
        }
    }
    return null;
}
