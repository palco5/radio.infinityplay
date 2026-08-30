<?php
/**
 * POST /api/polar_portal.php — pravi Polar Customer Session i vraća URL Polar
 * Customer Portal-a, gde korisnik (kao kod Claude/Stripe) profesionalno upravlja
 * plaćanjem: izmena/brisanje kartice, način plaćanja, fakture, otkaz pretplate.
 *
 * Pošto je Polar Merchant of Record, podaci kartice se NIKAD ne diraju kod nas —
 * sve ide na Polarovu PCI-bezbednu stranicu.
 */

require_once __DIR__ . '/config.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$currentUser = requireAuth();
$userId = $currentUser['userId'];

if (!POLAR_ACCESS_TOKEN) {
    sendJSON(['error' => 'Polar nije podešen na serveru'], 500);
}

$db = getDB();

// Polar customer id (kupac). Prvo iz profiles (ogledalo), pa iz subscriptions.
$stmt = $db->prepare('SELECT provider_customer_id FROM profiles WHERE id = ?');
$stmt->execute([$userId]);
$customerId = $stmt->fetchColumn() ?: null;

if (!$customerId) {
    $s = $db->prepare('SELECT provider_customer_id FROM subscriptions WHERE user_id = ? AND provider_customer_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1');
    $s->execute([$userId]);
    $customerId = $s->fetchColumn() ?: null;
}

if (!$customerId) {
    // Korisnik nikad nije platio karticom (nema Polar kupca) — nema šta da se upravlja.
    sendJSON(['error' => 'Nemate kartično plaćanje za upravljanje', 'needs_checkout' => true], 409);
}

$base = POLAR_ENVIRONMENT === 'production'
    ? 'https://api.polar.sh/v1'
    : 'https://sandbox-api.polar.sh/v1';
$origin = defined('CORS_ORIGIN') ? CORS_ORIGIN : 'https://radio.infinityplay.rs';

$ch = curl_init($base . '/customer-sessions/');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode([
        'customer_id' => $customerId,
        'return_url'  => rtrim($origin, '/') . '/dashboard',
    ], JSON_UNESCAPED_SLASHES),
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

$json = json_decode($resp, true);
if ($code < 200 || $code >= 300 || empty($json['customer_portal_url'])) {
    error_log('polar_portal: Polar odbio (' . $code . '): ' . substr((string) $resp, 0, 300));
    sendJSON(['error' => 'Ne mogu da otvorim portal za plaćanje.'], 502);
}

sendJSON(['url' => $json['customer_portal_url']]);
