<?php
/**
 * GET /api/admin_billing.php            -> pregled svih pretplata + zbir po stanju
 * GET /api/admin_billing.php?events=SUB -> istorijat (timeline) jedne pretplate
 *
 * Admin-only. Spaja subscriptions + profiles, i čita audit trail iz billing_events
 * (otkaz, reaktivacija, aktivacija, kašnjenje…) — da vlasnik prati biznis.
 */

require_once __DIR__ . '/config.php';

setCORSHeaders();

$currentUser = requireAuth();
$db = getDB();

// Admin provera (kao u auth.php ?path=users).
$stmt = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
$stmt->execute([$currentUser['userId']]);
$admin = $stmt->fetch();
$allowedAdmins = ['darkospira@gmail.com', 'info@infinityplay.rs'];
if ((!$admin || !$admin['is_admin']) && !in_array($admin['email'] ?? '', $allowedAdmins, true)) {
    sendJSON(['error' => 'Forbidden'], 403);
}

// ── Prihod sa Polara (Metrics API) za izabrani period ───────────────────────
if (!empty($_GET['metrics'])) {
    $interval = in_array($_GET['interval'] ?? '', ['day', 'week', 'month', 'year'], true) ? $_GET['interval'] : 'day';
    $start = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['start'] ?? '') ? $_GET['start'] : date('Y-m-01');
    $end   = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['end'] ?? '') ? $_GET['end'] : date('Y-m-d');

    if (!POLAR_ACCESS_TOKEN) {
        sendJSON(['error' => 'Polar nije podešen'], 500);
    }
    $base = POLAR_ENVIRONMENT === 'production' ? 'https://api.polar.sh/v1' : 'https://sandbox-api.polar.sh/v1';
    $url = $base . '/metrics/?start_date=' . $start . '&end_date=' . $end . '&interval=' . $interval;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . POLAR_ACCESS_TOKEN, 'Accept: application/json'],
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $j = json_decode($resp, true);
    if ($code < 200 || $code >= 300 || !is_array($j)) {
        error_log('admin_billing metrics: ' . $code . ' ' . substr((string) $resp, 0, 300));
        sendJSON(['error' => 'Ne mogu da učitam prihod sa Polara'], 502);
    }
    $t = $j['totals'] ?? [];
    sendJSON([
        'currency' => 'EUR',
        'start'    => $start,
        'end'      => $end,
        'interval' => $interval,
        'totals'   => [
            'revenue'              => (int) ($t['revenue'] ?? 0),              // bruto, u centima
            'net_revenue'          => (int) ($t['net_revenue'] ?? 0),         // posle Polar provizije
            'orders'               => (int) ($t['orders'] ?? 0),
            'mrr'                  => (int) ($t['monthly_recurring_revenue'] ?? 0),
            'active_subscriptions' => (int) ($t['active_subscriptions'] ?? 0),
        ],
        'periods' => array_map(fn ($p) => [
            'timestamp' => $p['timestamp'] ?? null,
            'revenue'   => (int) ($p['revenue'] ?? 0),
        ], $j['periods'] ?? []),
    ]);
}

// ── Timeline jedne pretplate ────────────────────────────────────────────────
if (!empty($_GET['events'])) {
    $st = $db->prepare("SELECT type, reason, created_at FROM billing_events WHERE subscription_id = ? ORDER BY created_at ASC");
    $st->execute([$_GET['events']]);
    sendJSON(['events' => $st->fetchAll()]);
}

// ── Lista svih pretplata + podaci o korisniku ───────────────────────────────
$rows = $db->query("
    SELECT s.id, s.user_id, s.state, s.plan, s.payment_method, s.billing_provider,
           s.cancel_at_period_end, s.current_period_end, s.access_until, s.trial_ends_at,
           s.provider_subscription_id, s.provider_customer_id, s.created_at, s.updated_at,
           p.email, p.display_name, p.username
    FROM subscriptions s
    JOIN profiles p ON p.id = s.user_id
    ORDER BY s.updated_at DESC
")->fetchAll();

// Zbir po stanju i načinu plaćanja.
$byState = [];
$byMethod = [];
foreach ($rows as $r) {
    $byState[$r['state']] = ($byState[$r['state']] ?? 0) + 1;
    $byMethod[$r['payment_method']] = ($byMethod[$r['payment_method']] ?? 0) + 1;
}

sendJSON([
    'summary' => [
        'total'     => count($rows),
        'by_state'  => $byState,
        'by_method' => $byMethod,
    ],
    'subscriptions' => $rows,
]);
