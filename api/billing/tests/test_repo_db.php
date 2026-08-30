<?php
/**
 * DB-integracioni testovi — traže lokalnu MariaDB (kao na sajtu, ali lokalno).
 * Pokreni:
 *   php api/billing/tests/test_repo_db.php
 * Konekcija (podrazumevano lokalna baza; override kroz env):
 *   DB_HOST=127.0.0.1 DB_NAME=infinityplay_local DB_USER=$(whoami) DB_PASS= php ...
 *
 * Pokriva garancije koje state machine sam ne može:
 *  - dupli cron: unique (subscription_id, period_key) blokira drugu fakturu
 *  - dupli webhook: recordWebhookEvent idempotentan
 *  - atomičan brojač faktura (bez rupa)
 *  - prelaz stanja se ispravno persistira i loguje u billing_events
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../BillingRepo.php';

use Billing\BillingRepo;
use Billing\Subscription as S;

$host   = getenv('DB_HOST') ?: '127.0.0.1';
$name   = getenv('DB_NAME') ?: 'infinityplay_local';
$user   = getenv('DB_USER') ?: (get_current_user() ?: 'root');
$pass   = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
// Lokalni MariaDB (brew) često koristi unix_socket auth; ako je socket dostupan
// i nije zadat DB_HOST, konektuj se preko socket-a (kao mysql CLI) umesto TCP-a.
$socket = getenv('DB_SOCKET') ?: (getenv('DB_HOST') ? '' : (file_exists('/tmp/mysql.sock') ? '/tmp/mysql.sock' : ''));
$dsn = $socket
    ? "mysql:unix_socket={$socket};dbname={$name};charset=utf8mb4"
    : "mysql:host={$host};dbname={$name};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (\Throwable $e) {
    fwrite(STDERR, "PRESKAČEM DB testove — ne mogu na bazu {$name}@{$host}: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Podesi env DB_HOST/DB_NAME/DB_USER/DB_PASS ili pokreni lokalni MariaDB.\n");
    exit(0);
}

$pdo->exec("SET time_zone = '+02:00'"); // Europe/Belgrade (letnje)
$repo = new BillingRepo($pdo);

// ── Izolovani fixtures; čistimo na kraju ────────────────────────────────────
$suffix   = substr(bin2hex(random_bytes(4)), 0, 8);
$userId   = 'u-' . $suffix;
$clientId = 'c-' . $suffix;
$subId    = 's-' . $suffix;

$pdo->prepare("INSERT INTO profiles (id, email, password) VALUES (?, ?, ?)")
    ->execute([$userId, "test-{$suffix}@example.com", 'x']);
$pdo->prepare("INSERT INTO billing_clients (id, user_id, naziv, pib, maticni_broj, adresa, grad, postanski_broj, email)
               VALUES (?,?,?,?,?,?,?,?,?)")
    ->execute([$clientId, $userId, 'Test DOO', '100000009', '20000006', 'Ulica 1', 'Beograd', '11000', "fakture-{$suffix}@example.com"]);
$pdo->prepare("INSERT INTO subscriptions (id, user_id, client_id, plan, ciklus, state, trial_ends_at)
               VALUES (?,?,?,?,?,?,?)")
    ->execute([$subId, $userId, $clientId, 'branded-radio', 'godisnje', 'trialing', '2026-08-20 00:00:00']);

// Test-godina: izoluje brojač faktura od realnih godina.
const TEST_YEAR = 2098;
$webhookIds = [];

$cleanup = function () use ($pdo, $userId, $subId, &$webhookIds) {
    $pdo->prepare("DELETE FROM invoices WHERE subscription_id = ?")->execute([$subId]);
    $pdo->prepare("DELETE FROM billing_events WHERE subscription_id = ?")->execute([$subId]);
    $pdo->prepare("DELETE FROM profiles WHERE id = ?")->execute([$userId]); // kaskadno briše subscription/client
    $pdo->prepare("DELETE FROM invoice_counters WHERE year IN (2098, 2099)")->execute();
    foreach ($webhookIds as $eid) {
        $pdo->prepare("DELETE FROM webhook_events WHERE event_id = ?")->execute([$eid]);
    }
};

function mkInvoice(string $subId, string $clientId, string $periodKey, int $seq): array {
    $y = TEST_YEAR;
    $num = "{$y}-" . str_pad((string) $seq, 6, '0', STR_PAD_LEFT);
    return [
        'subscription_id' => $subId, 'client_id' => $clientId,
        'broj_fakture' => $num, 'period_key' => $periodKey,
        'datum_izdavanja' => '2026-08-14', 'datum_valute' => '2026-08-22', 'datum_prometa' => '2026-08-14',
        'poziv_na_broj' => "97 {$seq}", 'poziv_na_broj_ips' => "97{$seq}",
        'osnovica' => '10000.00', 'pdv' => '2000.00', 'ukupno' => '12000.00',
        'stavke' => [['naziv' => 'Pretplata', 'kolicina' => 1, 'cena' => '10000.00', 'pdvStopa' => 20]],
        'status' => 'draft',
    ];
}

try {
    // ── Atomičan brojač faktura: uzastopni pozivi daju 1,2,3… bez rupa ───────
    test('nextInvoiceSequence: uzastopan i bez rupa', function () use ($repo, $pdo) {
        $pdo->prepare("DELETE FROM invoice_counters WHERE year = 2099")->execute();
        $a = $repo->nextInvoiceSequence(2099);
        $b = $repo->nextInvoiceSequence(2099);
        $c = $repo->nextInvoiceSequence(2099);
        assertEquals(1, $a);
        assertEquals(2, $b);
        assertEquals(3, $c);
        $pdo->prepare("DELETE FROM invoice_counters WHERE year = 2099")->execute();
    });

    // ── Dupli cron: druga faktura za isti period pada na unique indeksu ──────
    test('DUPLI CRON: druga faktura za (subscription, period) je odbijena', function () use ($repo, $subId, $clientId) {
        $seq1 = $repo->nextInvoiceSequence(TEST_YEAR);
        $id1 = $repo->createInvoice(mkInvoice($subId, $clientId, '2026-G-08', $seq1));
        assertTrue($id1 > 0);
        // findInvoiceByPeriod vidi postojeću (idempotentna provera pre kreiranja)
        assertTrue($repo->findInvoiceByPeriod($subId, '2026-G-08') !== null);
        // Drugi cron pokušava opet — mora pući na unique (23000)
        $threw = false;
        try {
            $seq2 = $repo->nextInvoiceSequence(TEST_YEAR);
            $repo->createInvoice(mkInvoice($subId, $clientId, '2026-G-08', $seq2));
        } catch (\PDOException $e) {
            $threw = ($e->getCode() === '23000');
        }
        assertTrue($threw, 'očekivano kršenje unique (subscription_id, period_key)');
    });

    // ── Dupli webhook: prvi put true, drugi put false (preskoči) ─────────────
    test('DUPLI WEBHOOK: recordWebhookEvent idempotentan', function () use ($repo, &$webhookIds) {
        $eid = 'ntf_' . bin2hex(random_bytes(4));
        $webhookIds[] = $eid;
        assertTrue($repo->recordWebhookEvent($eid, 'subscription.activated', ['a' => 1]));
        assertFalse($repo->recordWebhookEvent($eid, 'subscription.activated', ['a' => 1]));
    });

    // ── Prelaz se persistira i loguje ───────────────────────────────────────
    test('applyEvent: prelaz se upisuje u subscriptions + billing_events', function () use ($repo, $subId, $pdo) {
        $r = $repo->applyEvent($subId, S::EV_INVOICE_SENT);
        assertEquals('pending_payment', $r['changes']['state']);
        $fresh = $repo->getSubscription($subId);
        assertEquals('pending_payment', $fresh['state']);
        assertEquals('faktura', $fresh['payment_method']);
        assertTrue($fresh['access_until'] !== null);
        // hasAccess na svežem redu iz baze = true (u okviru grace-a)
        assertTrue(S::hasAccess($fresh, new DateTimeImmutable('2026-08-15 00:00:00', new DateTimeZone(S::TZ))));
        // billing_event zabeležen
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM billing_events WHERE subscription_id = ? AND type = 'state_change'");
        $cnt->execute([$subId]);
        assertTrue((int) $cnt->fetchColumn() >= 1);
    });

    // ── applyEvent idempotentan na nivou baze (dupli poziv ne menja stanje) ──
    test('applyEvent: ponovljen invoice_sent je noop, stanje nepromenjeno', function () use ($repo, $subId) {
        $before = $repo->getSubscription($subId);
        $r = $repo->applyEvent($subId, S::EV_INVOICE_SENT);
        assertTrue($r['noop']);
        $after = $repo->getSubscription($subId);
        assertEquals($before['state'], $after['state']);
    });

} finally {
    $cleanup();
}

summary();
