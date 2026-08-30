<?php
/**
 * Testovi PIB validacije (server) — nad stvarnim PIB-ovima postojećih firmi.
 * Pokreni:  php api/billing/tests/test_pib.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../Pib.php';

use Billing\Pib;

// Prva četiri su stvarni PIB-ovi (iz modula), poslednja tri su neispravna.
test('ispravni PIB-ovi prolaze', function () {
    foreach (['100002887', '100001636', '104052135', '101821487'] as $pib) {
        assertTrue(Pib::isValidPIB($pib), "PIB {$pib} bi trebalo da je ispravan");
    }
});
test('neispravni PIB-ovi padaju', function () {
    assertFalse(Pib::isValidPIB('123456789'), 'pogrešna kontrolna cifra');
    assertFalse(Pib::isValidPIB('12345678'), 'samo 8 cifara');
    assertFalse(Pib::isValidPIB('1000028870'), '10 cifara');
    assertFalse(Pib::isValidPIB('10000288a'), 'slovo');
    assertFalse(Pib::isValidPIB(''), 'prazno');
    assertFalse(Pib::isValidPIB(null), 'null');
});
test('matični broj — format 8 cifara', function () {
    assertTrue(Pib::isValidMaticniBroj('17162543'));
    assertTrue(Pib::isValidMaticniBroj('20084693'));
    assertFalse(Pib::isValidMaticniBroj('1234567'));   // 7 cifara
    assertFalse(Pib::isValidMaticniBroj('123456789')); // 9 cifara
});
test('normalizeId skida separatore', function () {
    assertEquals('100002887', Pib::normalizeId(' 100-002.887 '));
    assertEquals('', Pib::normalizeId('abc'));
});

summary();
