<?php
/**
 * Portal API za billing (autentifikovan korisnik):
 *   GET  /api/billing_portal.php            -> stanje pretplate + podaci za uplatu + IPS QR + istorija faktura
 *   POST /api/billing_portal.php?action=cancel      -> otkazivanje (faktura: cancel_at_period_end; kartica: Polar)
 *   POST /api/billing_portal.php?action=reactivate  -> reaktivacija u toku perioda
 *   GET  /api/billing_portal.php?action=invoice&id=N -> HTML jedne fakture (za pregled/štampu)
 *
 * hasAccess() je izvor istine; ovde vraćamo i izračunati `has_access` da UI ne
 * mora sam da ga računa.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/BillingRepo.php';
require_once __DIR__ . '/billing/Subscription.php';
require_once __DIR__ . '/billing/IpsQr.php';
require_once __DIR__ . '/billing/InvoiceTemplate.php';

use Billing\BillingRepo;
use Billing\Subscription;
use Billing\IpsQr;
use Billing\InvoiceTemplate;

setCORSHeaders();
date_default_timezone_set(Subscription::TZ);

$currentUser = requireAuth();
$userId = $currentUser['userId'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$db = getDB();
$repo = new BillingRepo($db);

// ── HTML pojedinačne fakture (pregled/štampa) ───────────────────────────────
if ($method === 'GET' && $action === 'invoice') {
    $invId = (int) ($_GET['id'] ?? 0);
    $inv = $repo->getInvoice($invId);
    if (!$inv) {
        sendJSON(['error' => 'Faktura ne postoji'], 404);
    }
    $sub = $repo->getSubscription($inv['subscription_id']);
    if (!$sub || $sub['user_id'] !== $userId) {
        sendJSON(['error' => 'Zabranjeno'], 403);
    }
    $client = $repo->getClient($inv['client_id']);
    $company = companyInfo();
    $qr = safeQr($inv, $client, $company);
    header('Content-Type: text/html; charset=utf-8');
    echo InvoiceTemplate::render($inv, $client, $company, $qr);
    exit;
}

// ── Otkazivanje / reaktivacija ──────────────────────────────────────────────
if ($method === 'POST' && in_array($action, ['cancel', 'reactivate'], true)) {
    $sub = $repo->getSubscriptionByUser($userId);
    if (!$sub) {
        sendJSON(['error' => 'Nema pretplate'], 404);
    }

    if ($action === 'cancel') {
        // Kartica: otkaži i kod provajdera (Polar), na kraju perioda. Webhook potvrđuje.
        if ($sub['payment_method'] === 'card' && !empty($sub['provider_subscription_id'])) {
            $ok = polarSetCancel($sub['provider_subscription_id'], true);
            if (!$ok) {
                sendJSON(['error' => 'Provajder je odbio zahtev za otkazivanje'], 502);
            }
        }
        try {
            $repo->applyEvent($sub['id'], Subscription::EV_USER_CANCELED);
        } catch (\Throwable $e) {
            sendJSON(['error' => 'Otkazivanje trenutno nije moguće'], 409);
        }
        mirror($repo, $userId);
        $fresh = $repo->getSubscription($sub['id']);
        sendJSON([
            'success' => true,
            'state' => $fresh['state'],
            'access_until' => $fresh['current_period_end'],
            'message' => 'Pretplata je otkazana. Pristup imate do kraja perioda.',
        ]);
    }

    // reactivate
    try {
        $repo->applyEvent($sub['id'], Subscription::EV_REACTIVATE);
    } catch (\Throwable $e) {
        // Period je istekao -> ide na checkout, ne kroz reactivate.
        sendJSON(['error' => 'Period je istekao — obnovite pretplatu kroz checkout.', 'needs_checkout' => true], 409);
    }
    // Kartica: ponovo aktiviraj kod provajdera (ukloni zakazano otkazivanje).
    if ($sub['payment_method'] === 'card' && !empty($sub['provider_subscription_id'])) {
        polarSetCancel($sub['provider_subscription_id'], false);
    }
    mirror($repo, $userId);
    $fresh = $repo->getSubscription($sub['id']);
    sendJSON(['success' => true, 'state' => $fresh['state']]);
}

// ── GET stanje ──────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $sub = $repo->getSubscriptionByUser($userId);
    if (!$sub) {
        sendJSON(['subscription' => null, 'has_access' => false, 'invoices' => []]);
    }

    $hasAccess = Subscription::hasAccess($sub);
    $payload = [
        'has_access' => $hasAccess,
        'subscription' => [
            'state'                => $sub['state'],
            'payment_method'       => $sub['payment_method'],
            'plan'                 => $sub['plan'],
            'ciklus'               => $sub['ciklus'],
            'current_period_end'   => $sub['current_period_end'],
            'access_until'         => $sub['access_until'],
            'cancel_at_period_end' => (bool) $sub['cancel_at_period_end'],
        ],
        'payment' => null,
        'invoices' => [],
    ];

    // Podaci za uplatu (kad je faktura i čeka se uplata / blokirano)
    if ($sub['payment_method'] === 'faktura' && in_array($sub['state'], [Subscription::PENDING_PAYMENT, Subscription::PAST_DUE], true)) {
        $inv = $repo->latestOpenInvoice($sub['id']);
        if ($inv) {
            $client = $repo->getClient($inv['client_id']);
            $company = companyInfo();
            $payload['payment'] = [
                'invoice_id'    => (int) $inv['id'],
                'broj_fakture'  => $inv['broj_fakture'],
                'ukupno'        => $inv['ukupno'],
                'valuta'        => $inv['valuta'],
                'racun'         => $company['racun'],
                'poziv_na_broj' => $inv['poziv_na_broj'],
                'primalac'      => $company['naziv'],
                'datum_valute'  => $inv['datum_valute'],
                'qr'            => safeQr($inv, $client, $company),
            ];
        }
    }

    $payload['invoices'] = array_map(function ($i) {
        return [
            'id'            => (int) $i['id'],
            'broj_fakture'  => $i['broj_fakture'],
            'datum'         => $i['datum_izdavanja'],
            'ukupno'        => $i['ukupno'],
            'valuta'        => $i['valuta'],
            'status'        => $i['status'],
            'placeno_datum' => $i['placeno_datum'],
        ];
    }, $repo->invoicesForSubscription($sub['id']));

    sendJSON($payload);
}

sendJSON(['error' => 'Not found'], 404);

// ─────────────────────────────────────────────────────────────────────────────

function companyInfo(): array
{
    return [
        'naziv'         => COMPANY_NAZIV,
        'pib'           => COMPANY_PIB,
        'maticniBroj'   => COMPANY_MB,
        'adresa'        => COMPANY_ADRESA,
        'grad'          => COMPANY_GRAD,
        'postanskiBroj' => COMPANY_PTT,
        'email'         => COMPANY_EMAIL,
        'telefon'       => COMPANY_TELEFON,
        'racun'         => COMPANY_RACUN,
        'uSistemuPdv'   => (bool) COMPANY_U_SISTEMU_PDV,
    ];
}

/** IPS QR data URL; prazan string ako podaci firme (račun) nisu podešeni. */
function safeQr(array $inv, ?array $client, array $company): string
{
    try {
        return IpsQr::pngDataUrl([
            'racun'       => $company['racun'],
            'primalac'    => "{$company['naziv']}, {$company['adresa']}, {$company['grad']}",
            'iznos'       => $inv['ukupno'],
            'svrha'       => "Pretplata {$inv['period_key']}",
            'pozivNaBroj' => $inv['poziv_na_broj_ips'],
            'platilac'    => $client['naziv'] ?? '',
        ]);
    } catch (\Throwable $e) {
        return '';
    }
}

function mirror(BillingRepo $repo, string $userId): void
{
    $sub = $repo->getSubscriptionByUser($userId);
    if (!$sub) return;
    switch ($sub['state']) {
        case Subscription::TRIALING:        $status = 'trial';    $ends = $sub['trial_ends_at']; break;
        case Subscription::ACTIVE:
        case Subscription::CANCELING:       $status = 'active';   $ends = $sub['current_period_end']; break;
        case Subscription::PENDING_PAYMENT: $status = 'active';   $ends = $sub['access_until']; break;
        case Subscription::PAST_DUE:        $status = 'past_due'; $ends = $sub['current_period_end']; break;
        default:                            $status = 'expired';  $ends = $sub['current_period_end']; break;
    }
    getDB()->prepare('UPDATE profiles SET subscription_status=?, subscription_ends_at=?, cancel_at_period_end=? WHERE id=?')
        ->execute([$status, $ends, (int) $sub['cancel_at_period_end'], $userId]);
}

/**
 * Postavi/ukloni zakazano otkazivanje na Polar pretplati.
 * @param bool $cancel true = otkaži na kraju perioda; false = reaktiviraj
 */
function polarSetCancel(string $subscriptionId, bool $cancel): bool
{
    if (!POLAR_ACCESS_TOKEN) return false;
    $base = POLAR_ENVIRONMENT === 'production' ? 'https://api.polar.sh/v1' : 'https://sandbox-api.polar.sh/v1';

    $ch = curl_init($base . '/subscriptions/' . rawurlencode($subscriptionId));
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_POSTFIELDS     => json_encode(['cancel_at_period_end' => $cancel]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . POLAR_ACCESS_TOKEN,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}
