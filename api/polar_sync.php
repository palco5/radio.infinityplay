<?php
/**
 * POST /api/polar_sync.php — povlači stanje pretplate sa Polar API-ja odmah po
 * povratku sa checkout-a, umesto da čeka webhook. Rešava dva slučaja:
 *   1) localhost/dev: Polar webhook ne može da stigne do lokalnog servera;
 *   2) produkcija: webhook zna da kasni par sekundi (race sa redirect-om).
 *
 * Telo: { checkout_id }. Server preuzme checkout, PROVERI da metadata.user_id
 * odgovara ulogovanom korisniku (da neko ne sinhronizuje tuđu pretplatu), pa
 * učita subscription i primeni isti PolarMapper kao webhook.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/BillingRepo.php';
require_once __DIR__ . '/billing/PolarMapper.php';
require_once __DIR__ . '/billing/Subscription.php';

use Billing\BillingRepo;
use Billing\PolarMapper;
use Billing\Subscription;

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$currentUser = requireAuth();
$userId = $currentUser['userId'];
$body   = getRequestBody() ?: [];
$checkoutId = trim((string) ($body['checkout_id'] ?? ''));

if ($checkoutId === '') {
    sendJSON(['error' => 'Nedostaje checkout_id'], 422);
}
if (!POLAR_ACCESS_TOKEN) {
    sendJSON(['error' => 'Polar nije podešen na serveru'], 500);
}

$base = POLAR_ENVIRONMENT === 'production'
    ? 'https://api.polar.sh/v1'
    : 'https://sandbox-api.polar.sh/v1';

// 1) Preuzmi checkout i proveri vlasništvo.
$checkout = polarGet($base . '/checkouts/' . rawurlencode($checkoutId));
if ($checkout === null) {
    sendJSON(['error' => 'Ne mogu da učitam checkout sa Polara'], 502);
}
$metaUser = $checkout['metadata']['user_id'] ?? null;
if ($metaUser !== null && (string) $metaUser !== (string) $userId) {
    sendJSON(['error' => 'Checkout ne pripada ovom nalogu'], 403);
}

// 2) Nađi subscription. Polar NE stavlja subscription_id na sam checkout objekat
//    (ostane NULL i kad je uplata uspešna) — pa ga tražimo preko kupca.
$subData = null;
$subscriptionId = $checkout['subscription_id'] ?? ($checkout['subscription']['id'] ?? null);

if (!$subscriptionId) {
    $customerId = $checkout['customer_id'] ?? ($checkout['customer']['id'] ?? null);
    if ($customerId) {
        $list = polarGet($base . '/subscriptions/?customer_id=' . rawurlencode($customerId) . '&limit=10');
        $items = $list['items'] ?? [];
        // Preferiraj upotrebljivu (aktivnu/trial/past_due), inače najnoviju.
        foreach ($items as $it) {
            if (in_array($it['status'] ?? '', ['active', 'trialing', 'past_due'], true)) { $subData = $it; break; }
        }
        if ($subData === null && $items) {
            $subData = $items[0];
        }
        $subscriptionId = $subData['id'] ?? null;
    }
}

if (!$subscriptionId) {
    // Uplata možda još nije potvrđena / nije subscription proizvod — nije greška.
    sendJSON(['synced' => false, 'pending' => true]);
}

// Ako nemamo pun objekat iz liste, dovuci ga po ID-u.
if ($subData === null) {
    $subData = polarGet($base . '/subscriptions/' . rawurlencode($subscriptionId));
}
if ($subData === null) {
    sendJSON(['error' => 'Ne mogu da učitam pretplatu sa Polara'], 502);
}

// 3) Primeni isto mapiranje kao webhook (status u $subData određuje stanje).
$productMap = [
    POLAR_PRODUCT_BASIC          => 'basic-radio',
    POLAR_PRODUCT_BRANDED        => 'branded-radio',
    POLAR_PRODUCT_HOST           => 'host-radio',
    POLAR_PRODUCT_BASIC_ANNUAL   => 'basic-radio',
    POLAR_PRODUCT_BRANDED_ANNUAL => 'branded-radio',
    POLAR_PRODUCT_HOST_ANNUAL    => 'host-radio',
];

$mapped = PolarMapper::map('subscription.active', $subData, $productMap, Subscription::now());
if ($mapped === null) {
    sendJSON(['synced' => false, 'pending' => true]);
}

$repo = new BillingRepo(getDB());
$sub = $repo->syncProviderSubscription($userId, $mapped['fields'], $mapped['reason']);
$repo->mirrorProfiles($userId, $sub);

sendJSON(['synced' => true, 'state' => $sub['state']]);

// ─────────────────────────────────────────────────────────────────────────────

/** GET na Polar API sa Bearer tokenom; vraća dekodovan niz ili null na grešci. */
function polarGet(string $url): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . POLAR_ACCESS_TOKEN,
            'Accept: application/json',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($resp === false || $code < 200 || $code >= 300) {
        error_log('polar_sync GET ' . $url . ' -> ' . $code . ': ' . substr((string) $resp, 0, 300));
        return null;
    }
    $json = json_decode($resp, true);
    return is_array($json) ? $json : null;
}
