<?php
/**
 * Integracioni testovi crona obnove/dunninga — lokalna MariaDB. Poziva stvarni
 * api/billing_cron.php iz CLI-ja sa --date override-om i proverava efekte.
 *   php api/billing/tests/test_cron_db.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../BillingRepo.php';
require_once __DIR__ . '/../Subscription.php';

use Billing\BillingRepo;
use Billing\Subscription;

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
$tz = new DateTimeZone(Subscription::TZ);

$cronPath = realpath(__DIR__ . '/../../billing_cron.php');
// Cron mora da koristi lokalnu bazu i dryrun mejl -> config.local.php to već radi.
function runCron(string $cronPath, string $date): array {
    $cmd = 'php ' . escapeshellarg($cronPath) . ' --date=' . escapeshellarg($date) . ' 2>/dev/null';
    $out = shell_exec($cmd);
    return json_decode((string) $out, true) ?: [];
}

$cleanup = [];
function fixtureRenewal(PDO $pdo, string $ciklus, string $periodEnd): array {
    $sfx = substr(bin2hex(random_bytes(4)), 0, 8);
    $uid = "cr-u-{$sfx}"; $cid = "cr-c-{$sfx}"; $sid = "cr-s-{$sfx}";
    $pdo->prepare("INSERT INTO profiles (id,email,password,subscription_status) VALUES (?,?,?,?)")->execute([$uid, "$uid@e.rs", 'x', 'active']);
    $pdo->prepare("INSERT INTO billing_clients (id,user_id,naziv,pib,maticni_broj,adresa,grad,postanski_broj,email,u_sistemu_pdv,drzava,sef_registered)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$cid, $uid, 'Kupac DOO', '100001636', '20084693', 'Ulica 1', 'Novi Sad', '21000', "k-{$sfx}@e.rs", 1, 'RS', 1]);
    $start = (new DateTimeImmutable($periodEnd))->modify($ciklus === 'godisnje' ? '-1 year' : '-1 month');
    $pdo->prepare("INSERT INTO subscriptions (id,user_id,client_id,payment_method,plan,ciklus,broj_lokacija,cena_po_lokaciji,state,current_period_start,current_period_end,next_billing_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$sid, $uid, $cid, 'faktura', 'branded-radio', $ciklus, 1, 41300, 'active',
                   $start->format('Y-m-d H:i:s'), $periodEnd . ' 12:00:00', $periodEnd]);
    return ['uid' => $uid, 'cid' => $cid, 'sid' => $sid];
}

$reg = function (array $f) use (&$cleanup) { $cleanup[] = $f['uid']; return $f; };

try {
    // ── OBNOVA: 7 dana pre E generiše fakturu (queue posao) ─────────────────
    test('obnova: E-7 generiše fakturu za naredni period + queue job', function () use ($pdo, $repo, $reg, $cronPath) {
        $f = $reg(fixtureRenewal($pdo, 'godisnje', '2026-09-01'));
        $log = runCron($cronPath, '2026-08-25'); // E-7
        assertTrue($log['renewals_issued'] >= 1, 'bar jedna obnova');
        $stmt = $pdo->prepare("SELECT * FROM invoices WHERE subscription_id=?");
        $stmt->execute([$f['sid']]);
        $inv = $stmt->fetch(PDO::FETCH_ASSOC);
        assertTrue($inv !== false, 'faktura za obnovu kreirana');
        assertEquals('2026-09-01', $inv['datum_valute'], 'rok plaćanja = kraj tekućeg perioda (E)');
        // queue job za izdavanje
        $j = $pdo->query("SELECT COUNT(*) FROM billing_jobs WHERE type='issue_invoice'")->fetchColumn();
        assertTrue((int) $j >= 1, 'queue job za izdavanje');
    });

    // ── DUPLI CRON isti dan: ne pravi drugu fakturu ─────────────────────────
    test('dupli cron u istom danu: druga faktura se NE kreira', function () use ($pdo, $repo, $reg, $cronPath) {
        $f = $reg(fixtureRenewal($pdo, 'godisnje', '2026-10-01'));
        runCron($cronPath, '2026-09-24');
        runCron($cronPath, '2026-09-24'); // opet isti dan
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM invoices WHERE subscription_id=?");
        $cnt->execute([$f['sid']]);
        assertEquals(1, (int) $cnt->fetchColumn(), 'tačno jedna faktura za period');
    });

    // ── DOSPELA obnova neplaćena: active -> pending_payment ─────────────────
    test('na dan E, neplaćeno: active -> pending_payment (+3 dana pristupa)', function () use ($pdo, $repo, $reg, $cronPath) {
        $f = $reg(fixtureRenewal($pdo, 'godisnje', '2026-11-01'));
        runCron($cronPath, '2026-11-01'); // E danas
        $sub = $repo->getSubscription($f['sid']);
        assertEquals(Subscription::PENDING_PAYMENT, $sub['state']);
        assertTrue(!empty($sub['access_until']));
        // pristup i dalje radi u grace-u
        assertTrue(Subscription::hasAccess($sub, new DateTimeImmutable('2026-11-02 10:00:00', new DateTimeZone(Subscription::TZ))));
        // profiles mirror = active (jer pending ima pristup)
        $ps = $pdo->prepare("SELECT subscription_status FROM profiles WHERE id=?"); $ps->execute([$f['uid']]);
        assertEquals('active', $ps->fetchColumn());
    });

    // ── Grace istekao: pending_payment -> past_due (stream gasne) ────────────
    test('grace istekao: pending_payment -> past_due, profiles past_due', function () use ($pdo, $repo, $reg, $cronPath) {
        $f = $reg(fixtureRenewal($pdo, 'godisnje', '2026-12-01'));
        // Postavi u pending_payment sa access_until u prošlosti
        $pdo->prepare("UPDATE subscriptions SET state='pending_payment', access_until='2027-01-05 12:00:00' WHERE id=?")->execute([$f['sid']]);
        runCron($cronPath, '2027-01-06'); // dan posle access_until
        $sub = $repo->getSubscription($f['sid']);
        assertEquals(Subscription::PAST_DUE, $sub['state']);
        assertFalse(Subscription::hasAccess($sub, new DateTimeImmutable('2027-01-06 12:00:00', new DateTimeZone(Subscription::TZ))));
        $ps = $pdo->prepare("SELECT subscription_status FROM profiles WHERE id=?"); $ps->execute([$f['uid']]);
        assertEquals('past_due', $ps->fetchColumn());
    });

    // ── PODSETNIK 3 dana pre dospeća, dedup na ponovni cron ─────────────────
    test('podsetnik pre_3 se šalje jednom (dedup)', function () use ($pdo, $repo, $reg, $cronPath) {
        $f = $reg(fixtureRenewal($pdo, 'godisnje', '2027-03-01'));
        // Napravi otvorenu (sent) fakturu sa dospećem za 3 dana od test-datuma
        $repo->nextInvoiceSequence(2027);
        $pdo->prepare("INSERT INTO invoices (subscription_id,client_id,broj_fakture,period_key,datum_izdavanja,datum_valute,datum_prometa,poziv_na_broj,poziv_na_broj_ips,osnovica,pdv,ukupno,stavke,status)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$f['sid'], $f['cid'], '2027-R00001', '2027-R-01', '2027-02-20', '2027-02-25', '2027-02-20', '97-27000001', '9797270001', 41300, 8260, 49560, json_encode([['naziv'=>'x','kolicina'=>1,'cena'=>41300,'pdvStopa'=>20]]), 'sent']);
        $log1 = runCron($cronPath, '2027-02-22'); // 3 dana pre 02-25
        $log2 = runCron($cronPath, '2027-02-22'); // opet isti dan
        $sent = $pdo->prepare("SELECT COUNT(*) FROM billing_events WHERE type='reminder_sent' AND reason='pre_3' AND subscription_id=?");
        $sent->execute([$f['sid']]);
        assertEquals(1, (int) $sent->fetchColumn(), 'podsetnik pre_3 tačno jednom');
    });

} finally {
    foreach ($cleanup as $uid) {
        $pdo->prepare("DELETE FROM billing_events WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id=?)")->execute([$uid]);
        $pdo->prepare("DELETE FROM profiles WHERE id=?")->execute([$uid]);
    }
    $pdo->exec("DELETE FROM billing_jobs");
    $pdo->exec("DELETE FROM invoice_counters");
}

summary();
