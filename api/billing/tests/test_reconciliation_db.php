<?php
/**
 * Integracioni testovi uparivanja uplata (BankReconciliation) — lokalna MariaDB.
 *   php api/billing/tests/test_reconciliation_db.php
 *
 * Pokriva tvoje zahteve iz Koraka 7:
 *  - tačna uplata (po pozivu na broj) zatvara fakturu + pretplata -> active
 *  - pogrešan iznos NE zatvara fakturu (status review, mismatch event)
 *  - dupli uvoz istog izvoda ne radi ništa dvaput (import_ref)
 *  - uplata bez ispravnog poziva na broj -> unmatched
 *  - uplata u zadnjem satu grace-a (pending_payment) -> active, pristup neprekidan
 *  - camt.053 parser vadi samo prilive (CRDT)
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../BillingRepo.php';
require_once __DIR__ . '/../BankReconciliation.php';
require_once __DIR__ . '/../PozivNaBroj.php';
require_once __DIR__ . '/../Subscription.php';

use Billing\BillingRepo;
use Billing\BankReconciliation;
use Billing\PozivNaBroj;
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

/** camt.053 sa jednom priliv-stavkom + jednom isplatom (DBIT, ignoriše se). */
function camt(string $pnbIps, float $iznos, string $ref, string $datum = '2026-08-20'): string {
    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <Stmt>
      <Ntry>
        <Amt Ccy="RSD">{$iznos}</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>{$datum}</Dt></BookgDt>
        <AcctSvcrRef>{$ref}</AcctSvcrRef>
        <NtryDtls><TxDtls>
          <RmtInf><Strd><CdtrRefInf><Ref>{$pnbIps}</Ref></CdtrRefInf></Strd></RmtInf>
          <RltdPties><Dbtr><Nm>Kupac DOO</Nm></Dbtr></RltdPties>
        </TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="RSD">500.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <BookgDt><Dt>{$datum}</Dt></BookgDt>
        <AcctSvcrRef>isplata-1</AcctSvcrRef>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>
XML;
}

$cleanup = [];
/** Napravi (user, client, subscription pending_payment, faktura sent) sa datim seq. */
function fixtureInvoice(PDO $pdo, BillingRepo $repo, float $ukupno, int $seq): array {
    $sfx = substr(bin2hex(random_bytes(4)), 0, 8);
    $uid = "rc-u-{$sfx}"; $cid = "rc-c-{$sfx}"; $sid = "rc-s-{$sfx}";
    $pdo->prepare("INSERT INTO profiles (id,email,password,subscription_status) VALUES (?,?,?,?)")->execute([$uid, "$uid@e.rs", 'x', 'active']);
    $pdo->prepare("INSERT INTO billing_clients (id,user_id,naziv,pib,maticni_broj,adresa,grad,postanski_broj,email,u_sistemu_pdv,drzava)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$cid, $uid, 'Kupac DOO', '100001636', '20084693', 'Ulica 1', 'Novi Sad', '21000', "k-{$sfx}@e.rs", 1, 'RS']);
    $now = new DateTimeImmutable('now', new DateTimeZone(Subscription::TZ));
    $pdo->prepare("INSERT INTO subscriptions (id,user_id,client_id,payment_method,plan,ciklus,broj_lokacija,cena_po_lokaciji,state,current_period_start,current_period_end,access_until,next_billing_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        ->execute([$sid, $uid, $cid, 'faktura', 'branded-radio', 'godisnje', 1, 41300, 'pending_payment',
                   $now->format('Y-m-d H:i:s'), $now->modify('+1 year')->format('Y-m-d H:i:s'),
                   $now->modify('+3 days')->format('Y-m-d H:i:s'), $now->modify('+1 year')->format('Y-m-d')]);
    $pnb = PozivNaBroj::build($seq, 2026);
    $osn = round($ukupno / 1.2, 2);
    $invId = $repo->createInvoice([
        'subscription_id' => $sid, 'client_id' => $cid,
        'broj_fakture' => "2026-" . str_pad((string)$seq, 6, '0', STR_PAD_LEFT), 'period_key' => "2026-G-RC{$seq}",
        'datum_izdavanja' => '2026-08-14', 'datum_valute' => '2026-08-20', 'datum_prometa' => '2026-08-14',
        'poziv_na_broj' => $pnb['formatted'], 'poziv_na_broj_ips' => $pnb['ips'],
        'osnovica' => $osn, 'pdv' => round($ukupno - $osn, 2), 'ukupno' => $ukupno,
        'stavke' => [['naziv'=>'Pretplata','kolicina'=>1,'cena'=>$osn,'pdvStopa'=>20]], 'status' => 'sent',
    ]);
    return ['uid' => $uid, 'cid' => $cid, 'sid' => $sid, 'invId' => $invId, 'pnb' => $pnb];
}
$reg = function (array $f) use (&$cleanup) { $cleanup[] = $f['uid']; return $f; };
$seq = 900000;

try {
    // ── Parser: samo prilivi (CRDT) ─────────────────────────────────────────
    test('parseCamt053: vadi samo CRDT prilive', function () {
        $txs = BankReconciliation::parseCamt053(camt('9712260001234', 148680, 'ref-1'));
        assertEquals(1, count($txs));
        assertEquals(148680.0, $txs[0]['iznos']);
        assertEquals('9712260001234', $txs[0]['poziv_na_broj']);
        assertEquals('Kupac DOO', $txs[0]['nalogodavac']);
    });

    // ── Tačna uplata zatvara fakturu + pretplata -> active ──────────────────
    test('tačna uplata: faktura paid, pretplata active, pristup ostaje', function () use ($pdo, $repo, $reg, &$seq) {
        $f = $reg(fixtureInvoice($pdo, $repo, 49560.00, ++$seq));
        $recon = new BankReconciliation($repo);
        $r = $recon->reconcile(BankReconciliation::parseCamt053(camt($f['pnb']['ips'], 49560.00, "r-{$seq}")));
        assertEquals(1, $r['matched']);
        $inv = $repo->getInvoice($f['invId']);
        assertEquals('paid', $inv['status']);
        assertEquals('49560.00', $inv['placeno_iznos']);
        $sub = $repo->getSubscription($f['sid']);
        assertEquals(Subscription::ACTIVE, $sub['state']);
        assertTrue(Subscription::hasAccess($sub));
    });

    // ── Pogrešan iznos NE zatvara fakturu ───────────────────────────────────
    test('manji iznos: faktura NIJE plaćena, bank_tx=review, mismatch event', function () use ($pdo, $repo, $reg, &$seq) {
        $f = $reg(fixtureInvoice($pdo, $repo, 49560.00, ++$seq));
        $recon = new BankReconciliation($repo);
        $r = $recon->reconcile(BankReconciliation::parseCamt053(camt($f['pnb']['ips'], 40000.00, "r-{$seq}")));
        assertEquals(1, $r['partial']);
        assertEquals(0, $r['matched']);
        $inv = $repo->getInvoice($f['invId']);
        assertEquals('sent', $inv['status'], 'faktura ostaje otvorena');
        assertEquals(Subscription::PENDING_PAYMENT, $repo->getSubscription($f['sid'])['state']);
        $bt = $pdo->prepare("SELECT status FROM bank_transactions WHERE import_ref=?"); $bt->execute(["r-{$seq}"]);
        assertEquals('review', $bt->fetchColumn());
        $ev = $pdo->prepare("SELECT COUNT(*) FROM billing_events WHERE invoice_id=? AND type='payment_amount_mismatch'");
        $ev->execute([$f['invId']]);
        assertTrue((int)$ev->fetchColumn() >= 1);
    });

    // ── Dupli uvoz istog izvoda ─────────────────────────────────────────────
    test('dupli uvoz (isti import_ref): drugi put bez efekta', function () use ($pdo, $repo, $reg, &$seq) {
        $f = $reg(fixtureInvoice($pdo, $repo, 49560.00, ++$seq));
        $recon = new BillingReconWrap($repo);
        $xml = camt($f['pnb']['ips'], 49560.00, "dup-{$seq}");
        $r1 = $recon->run($xml);
        $r2 = $recon->run($xml); // isti fajl opet
        assertEquals(1, $r1['matched']);
        assertEquals(0, $r2['matched'], 'drugi uvoz ne uparuje ponovo');
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM bank_transactions WHERE import_ref=?"); $cnt->execute(["dup-{$seq}"]);
        assertEquals(1, (int)$cnt->fetchColumn(), 'jedna bank_transaction');
    });

    // ── Bez ispravnog poziva na broj ────────────────────────────────────────
    test('bez ispravnog poziva na broj: unmatched', function () use ($pdo, $repo, &$seq) {
        $recon = new BankReconciliation($repo);
        $r = $recon->reconcile(BankReconciliation::parseCamt053(camt('123', 1000.00, "bad-{$seq}")));
        assertEquals(1, $r['unmatched']);
        $seq++;
    });

    // ── GRANIČNO: uplata u zadnjem satu grace-a ─────────────────────────────
    test('GRANIČNO: uplata dok je grace još aktivan -> active, pristup neprekidan', function () use ($pdo, $repo, $reg, &$seq) {
        $f = $reg(fixtureInvoice($pdo, $repo, 49560.00, ++$seq));
        // access_until za 1h u budućnosti (poslednji sat grace-a)
        $soon = (new DateTimeImmutable('now', new DateTimeZone(Subscription::TZ)))->modify('+1 hour')->format('Y-m-d H:i:s');
        $pdo->prepare("UPDATE subscriptions SET access_until=? WHERE id=?")->execute([$soon, $f['sid']]);
        assertTrue(Subscription::hasAccess($repo->getSubscription($f['sid']))); // pre uplate
        $recon = new BankReconciliation($repo);
        $recon->reconcile(BankReconciliation::parseCamt053(camt($f['pnb']['ips'], 49560.00, "g-{$seq}")));
        $sub = $repo->getSubscription($f['sid']);
        assertEquals(Subscription::ACTIVE, $sub['state']);
        assertTrue(Subscription::hasAccess($sub)); // posle uplate — neprekidno
    });

} finally {
    foreach ($cleanup as $uid) {
        $pdo->prepare("DELETE FROM bank_transactions WHERE matched_invoice_id IN (SELECT id FROM invoices WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id=?))")->execute([$uid]);
        $pdo->prepare("DELETE FROM billing_events WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id=?)")->execute([$uid]);
        $pdo->prepare("DELETE FROM profiles WHERE id=?")->execute([$uid]);
    }
    $pdo->exec("DELETE FROM bank_transactions");
    $pdo->exec("DELETE FROM invoice_counters");
}

summary();

/** Mali omotač da simulira dnevni uvoz istog fajla dvaput. */
class BillingReconWrap {
    public function __construct(private BillingRepo $repo) {}
    public function run(string $xml): array {
        $recon = new BankReconciliation($this->repo);
        return $recon->reconcile(BankReconciliation::parseCamt053($xml));
    }
}
