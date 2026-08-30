<?php
/**
 * Integracioni testovi izdavanja fakture (BillingService) — lokalna MariaDB,
 * lažni SEF i mejl. Pokriva tvoje zahteve iz Koraka 4:
 *  - happy path (SEF ok + mejl), idempotencija po kanalu
 *  - SEF odbio jer primalac nije registrovan -> pristup i mejl svejedno idu,
 *    klijent obeležen sef_registered=0
 *  - SEF nedostupan (mreža) -> sef_failed, mejl ide
 *  - strani klijent (drzava != RS) -> SEF preskočen, samo mejl
 *  - pad mejla -> izuzetak (job retry), SEF se ne šalje ponovo
 *
 *   php api/billing/tests/test_billing_service_db.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../BillingRepo.php';
require_once __DIR__ . '/../BillingService.php';
require_once __DIR__ . '/../Subscription.php';

use Billing\BillingRepo;
use Billing\BillingService;
use Billing\Subscription;
use Billing\SefSender;
use Billing\SefClientError;

// ── Lažni SEF-ovi ────────────────────────────────────────────────────────────
class FakeSefOk implements SefSender {
    public int $calls = 0;
    public function sendSalesInvoiceUbl(int $requestId, string $ublXml, int $sendToCir = 0) {
        $this->calls++;
        return ['InvoiceId' => 'SEF-' . $requestId, 'Status' => 'Sent'];
    }
}
class FakeSefNotRegistered implements SefSender {
    public int $calls = 0;
    public function sendSalesInvoiceUbl(int $requestId, string $ublXml, int $sendToCir = 0) {
        $this->calls++;
        $e = new SefClientError('rejected');
        $e->statusCode = 400;
        $e->body = 'Buyer is not registered on SEF';
        throw $e;
    }
}
class FakeSefDown implements SefSender {
    public int $calls = 0;
    public function sendSalesInvoiceUbl(int $requestId, string $ublXml, int $sendToCir = 0) {
        $this->calls++;
        throw new \RuntimeException('SEF mrežna greška (fake)');
    }
}

// ── Konekcija (lokalni socket, kao ostali DB testovi) ───────────────────────
$socket = getenv('DB_SOCKET') ?: (file_exists('/tmp/mysql.sock') ? '/tmp/mysql.sock' : '');
$name = getenv('DB_NAME') ?: 'infinityplay_local';
$user = getenv('DB_USER') ?: (get_current_user() ?: 'root');
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
$dsn = $socket ? "mysql:unix_socket={$socket};dbname={$name};charset=utf8mb4" : "mysql:host=127.0.0.1;dbname={$name};charset=utf8mb4";
try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (\Throwable $e) {
    fwrite(STDERR, "PRESKAČEM — nema baze {$name}: " . $e->getMessage() . "\n");
    exit(0);
}
$pdo->exec("SET time_zone = '+02:00'");
$repo = new BillingRepo($pdo);

$company = [
    'naziv' => 'Infinity Play', 'pib' => '100002887', 'maticniBroj' => '17162543',
    'adresa' => 'Ilije Bosilja 7', 'grad' => 'Novi Beograd', 'postanskiBroj' => '11070',
    'email' => 'info@infinityplay.rs', 'telefon' => '069602902',
    'racun' => '160000000000000099', 'uSistemuPdv' => true,
];

// Fabrika fixtura: napravi (user, client, subscription u pending_payment).
$made = [];
function makeFixture(PDO $pdo, string $drzava = 'RS', int $sefRegistered = 1): array {
    $sfx = substr(bin2hex(random_bytes(4)), 0, 8);
    $uid = "svc-u-{$sfx}"; $cid = "svc-c-{$sfx}"; $sid = "svc-s-{$sfx}";
    $pdo->prepare("INSERT INTO profiles (id,email,password) VALUES (?,?,?)")->execute([$uid, "$uid@e.rs", 'x']);
    $pdo->prepare("INSERT INTO billing_clients (id,user_id,naziv,pib,maticni_broj,adresa,grad,postanski_broj,email,u_sistemu_pdv,drzava,sef_registered)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$cid, $uid, 'Kupac DOO', '100001636', '20084693', 'Ulica 1', 'Novi Sad', '21000', "fakture-{$sfx}@e.rs", 1, $drzava, $sefRegistered]);
    $now = new DateTimeImmutable('now', new DateTimeZone(Subscription::TZ));
    $end = $now->modify('+1 year');
    $pdo->prepare("INSERT INTO subscriptions (id,user_id,client_id,payment_method,plan,ciklus,broj_lokacija,cena_po_lokaciji,state,current_period_start,current_period_end,access_until,next_billing_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$sid, $uid, $cid, 'faktura', 'branded-radio', 'godisnje', 3, 41300,
                   'pending_payment', $now->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s'),
                   $now->modify('+3 days')->format('Y-m-d H:i:s'), $end->format('Y-m-d')]);
    return ['uid' => $uid, 'cid' => $cid, 'sid' => $sid];
}

function svc(BillingRepo $repo, array $company, ?SefSender $sef, &$mailbox): BillingService {
    $send = function (string $to, string $subject, string $html) use (&$mailbox): bool {
        $mailbox[] = ['to' => $to, 'subject' => $subject, 'html' => $html];
        return true;
    };
    return new BillingService($repo, $company, $sef, $send, 5, null, 2, 1); // brzi retry u testu
}

function period(BillingRepo $repo, string $sid): array {
    $sub = $repo->getSubscription($sid);
    $start = new DateTimeImmutable($sub['current_period_start'], new DateTimeZone(Subscription::TZ));
    return BillingService::buildPeriod($start, $sub['ciklus'], 5);
}

$cleanupIds = [];
$reg = function (array $f) use (&$cleanupIds) { $cleanupIds[] = $f['uid']; return $f; };

try {
    // ── 1) Happy path: SEF ok + mejl, idempotencija ─────────────────────────
    test('happy path: SEF ok, faktura sent, UBL sačuvan, mejl poslat', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $mail = []; $sef = new FakeSefOk();
        $s = svc($repo, $company, $sef, $mail);
        $sub = $repo->getSubscription($f['sid']);
        $invId = $s->createInvoiceForSubscription($sub, period($repo, $f['sid']));
        $inv = $s->issueInvoice($invId);

        assertEquals('sent', $inv['status']);
        assertEquals(1, $sef->calls);
        assertEquals(1, count($mail));
        $fresh = $repo->getInvoice($invId);
        assertTrue($fresh['sef_invoice_id'] === 'SEF-' . $invId);
        assertTrue(!empty($fresh['ubl_xml']));
        assertTrue(!empty($fresh['email_sent_at']));
        assertTrue(strpos($fresh['ubl_xml'], '<Invoice') !== false);
        // pristup i dalje radi (pending_payment)
        assertTrue(Subscription::hasAccess($repo->getSubscription($f['sid'])));
    });

    test('idempotencija: createInvoiceForSubscription 2× -> ista faktura', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $mail = []; $s = svc($repo, $company, new FakeSefOk(), $mail);
        $sub = $repo->getSubscription($f['sid']);
        $a = $s->createInvoiceForSubscription($sub, period($repo, $f['sid']));
        $b = $s->createInvoiceForSubscription($sub, period($repo, $f['sid']));
        assertEquals($a, $b);
    });

    test('idempotencija: issueInvoice 2× -> mejl i SEF po jednom', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $mail = []; $sef = new FakeSefOk();
        $s = svc($repo, $company, $sef, $mail);
        $invId = $s->createInvoiceForSubscription($repo->getSubscription($f['sid']), period($repo, $f['sid']));
        $s->issueInvoice($invId);
        $s->issueInvoice($invId); // drugi put
        assertEquals(1, $sef->calls);
        assertEquals(1, count($mail));
    });

    // ── 2) SEF odbio jer primalac nije registrovan ──────────────────────────
    test('SEF odbio (nije registrovan): sef_failed, sef_registered=0, mejl+pristup ostaju', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $mail = []; $sef = new FakeSefNotRegistered();
        $s = svc($repo, $company, $sef, $mail);
        $invId = $s->createInvoiceForSubscription($repo->getSubscription($f['sid']), period($repo, $f['sid']));
        $inv = $s->issueInvoice($invId); // NE sme da baci

        assertEquals('sef_failed', $inv['status']);
        assertEquals(1, count($mail), 'mejl svejedno poslat');
        $client = $repo->getClient($f['cid']);
        assertEquals(0, (int) $client['sef_registered'], 'klijent obeležen da nije na SEF-u');
        assertTrue(Subscription::hasAccess($repo->getSubscription($f['sid'])), 'pristup i dalje radi');
    });

    // ── 3) SEF nedostupan (mreža) ───────────────────────────────────────────
    test('SEF nedostupan: sef_failed, mejl ide, bez izuzetka', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $mail = []; $sef = new FakeSefDown();
        $s = svc($repo, $company, $sef, $mail);
        $invId = $s->createInvoiceForSubscription($repo->getSubscription($f['sid']), period($repo, $f['sid']));
        $inv = $s->issueInvoice($invId);
        assertEquals('sef_failed', $inv['status']);
        assertTrue($sef->calls >= 2, 'retry se desio');
        assertEquals(1, count($mail));
    });

    // ── 4) Strani klijent (drzava != RS) -> SEF preskočen ───────────────────
    test('strani klijent (DE): SEF preskočen, samo mejl', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo, 'DE'));
        $mail = []; $sef = new FakeSefOk();
        $s = svc($repo, $company, $sef, $mail);
        $invId = $s->createInvoiceForSubscription($repo->getSubscription($f['sid']), period($repo, $f['sid']));
        $inv = $s->issueInvoice($invId);
        assertEquals(0, $sef->calls, 'SEF se ne zove za stranog klijenta');
        assertEquals('sent', $inv['status']);
        assertEquals(1, count($mail));
    });

    // ── 5) Pad mejla -> izuzetak, SEF poslat samo jednom pri ponovnom pokušaju ─
    test('pad mejla: izuzetak; retry ne šalje ponovo na SEF', function () use ($repo, $company, $pdo, $reg) {
        $f = $reg(makeFixture($pdo));
        $sef = new FakeSefOk();
        $failMail = function ($to, $sub, $html): bool { return false; }; // mejl pada
        $s1 = new BillingService($repo, $company, $sef, $failMail, 5, null, 2, 1);
        $invId = $s1->createInvoiceForSubscription($repo->getSubscription($f['sid']), period($repo, $f['sid']));
        assertThrows(RuntimeException::class, fn () => $s1->issueInvoice($invId));
        // SEF je već uspeo (status sent), sef_invoice_id upisan
        $mid = $repo->getInvoice($invId);
        assertEquals(1, $sef->calls);
        assertTrue(!empty($mid['sef_invoice_id']));
        assertTrue(empty($mid['email_sent_at']));
        // ponovni pokušaj sa ispravnim mejlom: SEF se NE zove opet, mejl prolazi
        $mail = []; $s2 = svc($repo, $company, $sef, $mail);
        $s2->issueInvoice($invId);
        assertEquals(1, $sef->calls, 'SEF nije ponovo pozvan');
        assertEquals(1, count($mail));
    });

} finally {
    foreach ($cleanupIds as $uid) {
        $pdo->prepare("DELETE FROM billing_events WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id=?)")->execute([$uid]);
        $pdo->prepare("DELETE FROM profiles WHERE id=?")->execute([$uid]);
    }
    $pdo->exec("DELETE FROM invoice_counters");
}

summary();
