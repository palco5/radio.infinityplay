<?php
/**
 * Unit testovi portovanih modula: PozivNaBroj (model 97), Ubl (UBL 2.1),
 * IpsQr (string + PNG). Bez baze.  php api/billing/tests/test_invoice_units.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../PozivNaBroj.php';
require_once __DIR__ . '/../Ubl.php';
require_once __DIR__ . '/../IpsQr.php';

use Billing\PozivNaBroj;
use Billing\Ubl;
use Billing\IpsQr;

// ── PozivNaBroj: cross-check sa Node modulom (identičan izlaz) ───────────────
test('PozivNaBroj.build == modul (formatted + ips)', function () {
    $expected = [
        [1,      '26-26000001', '972626000001'],
        [42,     '97-26000042', '979726000042'],
        [1234,   '13-26001234', '971326001234'],
        [999999, '48-26999999', '974826999999'],
    ];
    foreach ($expected as [$seq, $fmt, $ips]) {
        $p = PozivNaBroj::build($seq, 2026);
        assertEquals($fmt, $p['formatted'], "formatted za seq {$seq}");
        assertEquals($ips, $p['ips'], "ips za seq {$seq}");
    }
});
test('PozivNaBroj.isValid + extractBase roundtrip', function () {
    $p = PozivNaBroj::build(1234, 2026);
    assertTrue(PozivNaBroj::isValid($p['formatted']));
    assertTrue(PozivNaBroj::isValid($p['ips'], true));              // ips = 97 + kontrola + baza
    assertEquals('26001234', PozivNaBroj::extractBase($p['formatted']));
    assertFalse(PozivNaBroj::isValid('13-26001235')); // pogrešna kontrola
});

// ── UBL ──────────────────────────────────────────────────────────────────────
function sampleInvoice(): array {
    return [
        'brojFakture' => '2026-000123', 'datumIzdavanja' => '2026-08-14',
        'datumValute' => '2026-08-19', 'datumPrometa' => '2026-08-14',
        'prodavac' => ['naziv'=>'Infinity Play','pib'=>'100002887','maticniBroj'=>'17162543','adresa'=>'Ilije Bosilja 7','grad'=>'Beograd','postanskiBroj'=>'11070','email'=>'info@infinityplay.rs','uSistemuPdv'=>true],
        'kupac' => ['naziv'=>'Test Kupac d.o.o.','pib'=>'100001636','maticniBroj'=>'20084693','adresa'=>'Ulica 1','grad'=>'Novi Sad','postanskiBroj'=>'21000','email'=>'k@f.rs','uSistemuPdv'=>true],
        'racun' => '160000000000000099', 'pozivNaBroj' => '13-26001234',
        'stavke' => [['naziv'=>'Branded Radio — godišnja pretplata, 3 lok.','kolicina'=>3,'jedinicaMere'=>'H87','cena'=>41300,'pdvStopa'=>20]],
    ];
}
test('Ubl.build: validan XML + ključni elementi', function () {
    $xml = Ubl::build(sampleInvoice());
    $dom = new DOMDocument();
    assertTrue($dom->loadXML($xml), 'UBL mora biti valjan XML');
    foreach ([
        'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021',
        '<cbc:ID>2026-000123</cbc:ID>',
        '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>',
        '<cbc:PaymentID>13-26001234</cbc:PaymentID>',
        '<cbc:ID>160000000000000099</cbc:ID>',
        'RS100002887', // supplier PartyTaxScheme CompanyID
    ] as $needle) {
        assertTrue(strpos($xml, $needle) !== false, "UBL sadrži: {$needle}");
    }
});
test('Ubl.build: iznosi (osnovica/PDV/ukupno) tačni', function () {
    $xml = Ubl::build(sampleInvoice());
    // 3 × 41300 = 123900 osnovica; PDV 20% = 24780; ukupno 148680
    assertTrue(strpos($xml, '<cbc:LineExtensionAmount currencyID="RSD">123900.00</cbc:LineExtensionAmount>') !== false, 'osnovica');
    assertTrue(strpos($xml, '<cbc:TaxAmount currencyID="RSD">24780.00</cbc:TaxAmount>') !== false, 'PDV');
    assertTrue(strpos($xml, '<cbc:PayableAmount currencyID="RSD">148680.00</cbc:PayableAmount>') !== false, 'ukupno');
});
test('Ubl.calculateTotals', function () {
    $t = Ubl::calculateTotals([['kolicina'=>3,'cena'=>41300,'pdvStopa'=>20]]);
    assertEquals(123900.0, $t['osnovica']);
    assertEquals(24780.0, $t['pdv']);
    assertEquals(148680.0, $t['ukupno']);
});
test('Ubl: kupac van PDV-a -> TaxExemptionReason', function () {
    $inv = sampleInvoice();
    $inv['kupac']['uSistemuPdv'] = false;
    $inv['stavke'][0]['pdvStopa'] = 0;
    $xml = Ubl::build($inv);
    assertTrue(strpos($xml, 'TaxExemptionReason') !== false);
    assertTrue(strpos($xml, '<cbc:ID>O</cbc:ID>') !== false); // kategorija O (oslobođeno)
});

// ── IPS QR ─────────────────────────────────────────────────────────────────
test('IpsQr.buildString: format i tagovi', function () {
    $s = IpsQr::buildString([
        'racun'=>'160000000000000099','primalac'=>'Infinity Play, Ilije Bosilja 7, Beograd',
        'iznos'=>148680,'svrha'=>'Pretplata 2026-G-08','pozivNaBroj'=>'971326001234','platilac'=>'Test Kupac d.o.o.',
    ]);
    assertTrue(strpos($s, 'K:PR|V:01|C:1|R:160000000000000099|') === 0, 'header + račun');
    assertTrue(strpos($s, '|I:RSD148680,00|') !== false, 'iznos sa zarezom');
    assertTrue(strpos($s, '|SF:221|') !== false, 'šifra plaćanja');
    assertTrue(strpos($s, '|RO:971326001234') !== false, 'poziv na broj');
});
test('IpsQr.buildString: pogrešan račun baca', function () {
    assertThrows(InvalidArgumentException::class, fn () => IpsQr::buildString(['racun'=>'123','primalac'=>'X','iznos'=>100,'svrha'=>'s','pozivNaBroj'=>'97']));
});
test('IpsQr.pngDataUrl: validan PNG data URL', function () {
    $url = IpsQr::pngDataUrl([
        'racun'=>'160000000000000099','primalac'=>'Infinity Play','iznos'=>148680,
        'svrha'=>'Pretplata','pozivNaBroj'=>'971326001234',
    ]);
    assertTrue(strpos($url, 'data:image/png;base64,') === 0, 'prefiks');
    $png = base64_decode(substr($url, strlen('data:image/png;base64,')));
    assertEquals("\x89PNG\r\n\x1a\n", substr($png, 0, 8), 'PNG potpis');
    $img = imagecreatefromstring($png);
    assertTrue($img !== false, 'GD može da učita PNG');
    assertTrue(imagesx($img) > 40, 'slika ima razumnu širinu');
});

summary();
