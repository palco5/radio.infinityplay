<?php
/**
 * POST /api/checkout_firma.php — plaćanje po fakturi (firma).
 *
 * Na klik: u JEDNOJ transakciji upiše firmu + pretplatu (state=pending_payment,
 * access_until = now + 3 dana) i stavi posao izdavanja fakture u red (billing_jobs).
 * Slanje na SEF/mejl radi worker (Korak 4) — korisnik ne čeka. Odmah dobija pristup.
 *
 * PIB se validira i ovde na serveru (ne samo u browseru). Cena se računa
 * autoritativno iz Billing\Plans — nikad se ne uzima od klijenta.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/Subscription.php';
require_once __DIR__ . '/billing/BillingRepo.php';
require_once __DIR__ . '/billing/Pib.php';
require_once __DIR__ . '/billing/Plans.php';

use Billing\Subscription;
use Billing\Pib;
use Billing\Plans;

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

date_default_timezone_set(Subscription::TZ);

$currentUser = requireAuth();
$userId = $currentUser['userId'];
$body = getRequestBody() ?: [];

// ── Validacija ──────────────────────────────────────────────────────────────
$plan   = (string) ($body['plan'] ?? '');
$ciklus = (string) ($body['ciklus'] ?? 'godisnje');
$brojLokacija = (int) ($body['broj_lokacija'] ?? 1);

$pib          = Pib::normalizeId($body['pib'] ?? '');
$naziv        = trim((string) ($body['naziv'] ?? ''));
$maticniBroj  = Pib::normalizeId($body['maticni_broj'] ?? '');
$adresa       = trim((string) ($body['adresa'] ?? ''));
$grad         = trim((string) ($body['grad'] ?? ''));
$postanski    = trim((string) ($body['postanski_broj'] ?? ''));
$email        = trim((string) ($body['email'] ?? ''));
$kontakt      = trim((string) ($body['kontakt_osoba'] ?? '')) ?: null;
$uSistemuPdv  = !empty($body['u_sistemu_pdv']);

$errors = [];
if (!Plans::exists($plan))                    $errors['plan'] = 'Nepoznat paket';
if (!in_array($ciklus, ['mesecno', 'godisnje'], true)) $errors['ciklus'] = 'Ciklus mora biti mesecno ili godisnje';
// Host je godišnji paket — forsiraj godišnje bez obzira šta klijent pošalje.
if (Plans::exists($plan)) $ciklus = Plans::effectiveCiklus($plan, $ciklus);
if ($brojLokacija < 1 || $brojLokacija > 999) $errors['broj_lokacija'] = 'Broj lokacija mora biti 1–999';
if (!Pib::isValidPIB($pib))                   $errors['pib'] = 'PIB nije ispravan (9 cifara, kontrolna cifra)';
if ($naziv === '')                            $errors['naziv'] = 'Naziv firme je obavezan';
// Matični broj je OPCIONO (PIB je dovoljan) — ako je poslat, mora imati 8 cifara.
if ($maticniBroj !== '' && !Pib::isValidMaticniBroj($maticniBroj)) $errors['maticni_broj'] = 'Matični broj mora imati 8 cifara';
if ($adresa === '')                           $errors['adresa'] = 'Adresa je obavezna';
if ($grad === '')                             $errors['grad'] = 'Grad je obavezan';
if ($postanski === '')                        $errors['postanski_broj'] = 'Poštanski broj je obavezan';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Mejl za fakture nije ispravan';

if ($errors) {
    sendJSON(['error' => 'Podaci nisu ispravni', 'fields' => $errors], 422);
}

// ── Obračun (autoritativno) + prelaz stanja preko state machine ─────────────
$obracun = Plans::obracun($plan, $ciklus, $brojLokacija, /* prodavacUPdv */ true);

// Izračunaj polja prelaza trialing -> pending_payment (+3 dana) iz jedne funkcije.
$res = Subscription::apply(
    ['state' => Subscription::TRIALING, 'ciklus' => $ciklus],
    Subscription::EV_INVOICE_SENT,
    ['ciklus' => $ciklus]
);
$ch = $res['changes']; // state, payment_method, current_period_start/end, access_until, next_billing_date

$db = getDB();
$repo = new \Billing\BillingRepo($db);

try {
    $db->beginTransaction();

    // 1) Upsert firme (po user_id + pib)
    $stmt = $db->prepare('SELECT id FROM billing_clients WHERE user_id = ? AND pib = ?');
    $stmt->execute([$userId, $pib]);
    $clientId = $stmt->fetchColumn();

    if ($clientId) {
        $db->prepare(
            'UPDATE billing_clients SET naziv=?, maticni_broj=?, adresa=?, grad=?, postanski_broj=?,
                    email=?, kontakt_osoba=?, u_sistemu_pdv=?, drzava=?
             WHERE id=?'
        )->execute([$naziv, $maticniBroj, $adresa, $grad, $postanski, $email, $kontakt, $uSistemuPdv ? 1 : 0, 'RS', $clientId]);
    } else {
        $clientId = generateUUID();
        $db->prepare(
            'INSERT INTO billing_clients (id, user_id, naziv, pib, maticni_broj, adresa, grad,
                    postanski_broj, email, kontakt_osoba, u_sistemu_pdv, drzava)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([$clientId, $userId, $naziv, $pib, $maticniBroj, $adresa, $grad, $postanski, $email, $kontakt, $uSistemuPdv ? 1 : 0, 'RS']);
    }

    // 2) Upsert pretplate -> pending_payment (jedna po korisniku; uzmi poslednju)
    $stmt = $db->prepare('SELECT id FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$userId]);
    $subId = $stmt->fetchColumn();

    $subFields = [
        'client_id'            => $clientId,
        'payment_method'       => 'faktura',
        'plan'                 => $plan,
        'ciklus'               => $ciklus,
        'broj_lokacija'        => $brojLokacija,
        'cena_po_lokaciji'     => $obracun['cena_po_lokaciji'],
        'currency'             => 'RSD',
        'state'                => $ch['state'],
        'current_period_start' => $ch['current_period_start'],
        'current_period_end'   => $ch['current_period_end'],
        'access_until'         => $ch['access_until'],
        'next_billing_date'    => $ch['next_billing_date'],
        'cancel_at_period_end' => 0,
        'canceled_at'          => null,
    ];

    if ($subId) {
        $set = implode(', ', array_map(fn ($k) => "{$k} = :{$k}", array_keys($subFields)));
        $params = [];
        foreach ($subFields as $k => $v) { $params[":{$k}"] = $v; }
        $params[':id'] = $subId;
        $db->prepare("UPDATE subscriptions SET {$set} WHERE id = :id")->execute($params);
    } else {
        $subId = generateUUID();
        $cols = array_merge(['id' => $subId, 'user_id' => $userId], $subFields);
        $colNames = implode(', ', array_keys($cols));
        $placeholders = implode(', ', array_map(fn ($k) => ":{$k}", array_keys($cols)));
        $params = [];
        foreach ($cols as $k => $v) { $params[":{$k}"] = $v; }
        $db->prepare("INSERT INTO subscriptions ({$colNames}) VALUES ({$placeholders})")->execute($params);
    }

    // 3) Posao izdavanja fakture u red — worker (Korak 4) radi SEF + mejl van request-a.
    $db->prepare(
        "INSERT INTO billing_jobs (type, payload) VALUES ('issue_invoice', :p)"
    )->execute([':p' => json_encode(['subscription_id' => $subId], JSON_UNESCAPED_UNICODE)]);

    // 4) Ogledalo u profiles (privremeni most dok Korak 8 ne prebaci UI na hasAccess).
    //    pending_payment ima pristup do access_until -> to i mirror-ujemo.
    $db->prepare(
        "UPDATE profiles SET subscription_status='active', subscription_ends_at=:ends,
                selected_plan_id=:plan, subscription_tier=:tier, cancel_at_period_end=0
         WHERE id=:id"
    )->execute([
        ':ends' => $ch['access_until'],
        ':plan' => $plan,
        ':tier' => $plan,
        ':id'   => $userId,
    ]);

    // 5) Audit
    $repo->logEvent($subId, null, 'state_change', $res['reason'], [
        'event' => Subscription::EV_INVOICE_SENT,
        'to'    => $ch['state'],
        'source' => 'checkout_firma',
    ]);

    $db->commit();
} catch (\Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('checkout_firma failed: ' . $e->getMessage());
    sendJSON(['error' => 'Došlo je do greške pri obradi. Pokušajte ponovo.'], 500);
}

sendJSON([
    'success' => true,
    'redirect' => '/dashboard',
    'subscription' => [
        'id'           => $subId,
        'state'        => $ch['state'],
        'access_until' => $ch['access_until'],
        'ukupno'       => $obracun['ukupno'],
        'currency'     => 'RSD',
    ],
]);
