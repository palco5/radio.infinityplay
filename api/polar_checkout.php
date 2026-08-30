<?php
/**
 * POST /api/polar_checkout.php — pravi Polar Checkout Session za dati paket/ciklus
 * i vraća { url } (Polar hosted checkout / embed). Frontend otvara taj URL kroz
 * Polar embed (modal) ili redirect.
 *
 * Product ID se bira na serveru iz config-a (nikad se ne uzima od klijenta).
 * metadata.user_id povezuje kasniji webhook sa nalogom.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/Plans.php';

use Billing\Plans;

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$currentUser = requireAuth();
$userId = $currentUser['userId'];
$email  = $currentUser['email'] ?? null;
$body   = getRequestBody() ?: [];

$plan   = (string) ($body['plan'] ?? '');
$ciklus = (string) ($body['ciklus'] ?? 'godisnje');

if (!Plans::exists($plan)) {
    sendJSON(['error' => 'Nepoznat paket'], 422);
}
$ciklus = Plans::effectiveCiklus($plan, $ciklus);

if (!POLAR_ACCESS_TOKEN) {
    sendJSON(['error' => 'Polar nije podešen na serveru (nedostaje access token)'], 500);
}

$productId = polarProductId($plan, $ciklus);
if (!$productId) {
    sendJSON(['error' => "Nije podešen Polar product ID za {$plan}/{$ciklus}"], 500);
}

$base = POLAR_ENVIRONMENT === 'production'
    ? 'https://api.polar.sh/v1'
    : 'https://sandbox-api.polar.sh/v1';

$origin = defined('CORS_ORIGIN') ? CORS_ORIGIN : 'https://radio.infinityplay.rs';
$payload = [
    'products'      => [$productId],
    'customer_email'=> $email,
    'success_url'   => rtrim($origin, '/') . '/dashboard?checkout=success&cid={CHECKOUT_ID}',
    'embed_origin'  => rtrim($origin, '/'),
    'metadata'      => ['user_id' => $userId, 'plan' => $plan, 'ciklus' => $ciklus],
];

$ch = curl_init($base . '/checkouts/');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_SLASHES),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . POLAR_ACCESS_TOKEN,
        'Content-Type: application/json',
        'Accept: application/json',
    ],
]);
$resp = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($resp === false) {
    error_log('polar_checkout curl error: ' . $curlErr);
    sendJSON(['error' => 'Ne mogu da kontaktiram Polar.'], 502);
}
$json = json_decode($resp, true);
if ($code < 200 || $code >= 300 || !is_array($json) || empty($json['url'])) {
    error_log('polar_checkout: Polar odbio (' . $code . '): ' . substr($resp, 0, 500));
    sendJSON(['error' => 'Polar je odbio kreiranje checkout-a.', 'status' => $code], 502);
}

sendJSON(['url' => $json['url'], 'id' => $json['id'] ?? null]);

// ─────────────────────────────────────────────────────────────────────────────

function polarProductId(string $plan, string $ciklus): string
{
    $annual = $ciklus === 'godisnje';
    switch ($plan) {
        case 'basic-radio':   return $annual ? POLAR_PRODUCT_BASIC_ANNUAL   : POLAR_PRODUCT_BASIC;
        case 'branded-radio': return $annual ? POLAR_PRODUCT_BRANDED_ANNUAL : POLAR_PRODUCT_BRANDED;
        case 'host-radio':    return POLAR_PRODUCT_HOST_ANNUAL ?: POLAR_PRODUCT_HOST; // host je godišnji
        default:              return '';
    }
}
