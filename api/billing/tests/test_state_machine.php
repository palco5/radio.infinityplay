<?php
/**
 * Čisti unit testovi state machine-a i hasAccess() — bez baze.
 * Pokreni:  php api/billing/tests/test_state_machine.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../Subscription.php';

use Billing\Subscription as S;
use Billing\InvalidTransitionException;

$tz = new DateTimeZone(S::TZ);
$now = new DateTimeImmutable('2026-08-14 12:00:00', $tz);

/** Napravi red pretplate za test. */
function sub(array $over = []): array {
    return array_merge([
        'id' => 'sub-1', 'state' => 'trialing', 'ciklus' => 'godisnje',
        'trial_ends_at' => null, 'current_period_start' => null,
        'current_period_end' => null, 'access_until' => null,
        'cancel_at_period_end' => 0,
    ], $over);
}
function at(string $s): DateTimeImmutable { return new DateTimeImmutable($s, new DateTimeZone(S::TZ)); }

// ── hasAccess po stanjima (vremenski svesno) ────────────────────────────────
test('hasAccess: trialing pre isteka = true', function () use ($now) {
    assertTrue(S::hasAccess(sub(['state' => 'trialing', 'trial_ends_at' => '2026-08-20 00:00:00']), $now));
});
test('hasAccess: trialing posle isteka = false', function () use ($now) {
    assertFalse(S::hasAccess(sub(['state' => 'trialing', 'trial_ends_at' => '2026-08-10 00:00:00']), $now));
});
test('hasAccess: active do current_period_end', function () use ($now) {
    assertTrue(S::hasAccess(sub(['state' => 'active', 'current_period_end' => '2027-01-01 00:00:00']), $now));
    assertFalse(S::hasAccess(sub(['state' => 'active', 'current_period_end' => '2026-01-01 00:00:00']), $now));
});
test('hasAccess: pending_payment do access_until', function () use ($now) {
    assertTrue(S::hasAccess(sub(['state' => 'pending_payment', 'access_until' => '2026-08-17 12:00:00']), $now));
    assertFalse(S::hasAccess(sub(['state' => 'pending_payment', 'access_until' => '2026-08-13 12:00:00']), $now));
});
test('hasAccess: canceling ima pristup do kraja perioda', function () use ($now) {
    assertTrue(S::hasAccess(sub(['state' => 'canceling', 'current_period_end' => '2026-09-30 00:00:00']), $now));
});
test('hasAccess: past_due i expired = false', function () use ($now) {
    assertFalse(S::hasAccess(sub(['state' => 'past_due', 'access_until' => '2027-01-01 00:00:00']), $now));
    assertFalse(S::hasAccess(sub(['state' => 'expired', 'current_period_end' => '2027-01-01 00:00:00']), $now));
});
test('hasAccess: ne zavisi od SEF/faktura polja (samo stanje+datum)', function () use ($now) {
    $s = sub(['state' => 'pending_payment', 'access_until' => '2026-08-17 12:00:00', 'sef_status' => 'rejected']);
    assertTrue(S::hasAccess($s, $now)); // SEF odbio, ali pristup i dalje radi
});

// ── Osnovni prelazi ─────────────────────────────────────────────────────────
test('trialing --invoice_sent--> pending_payment (+3d, godišnji period)', function () use ($now) {
    $r = S::apply(sub(['state' => 'trialing']), S::EV_INVOICE_SENT, [], $now);
    assertEquals('pending_payment', $r['changes']['state']);
    assertEquals('faktura', $r['changes']['payment_method']);
    assertEquals('2026-08-17 12:00:00', $r['changes']['access_until']);   // now + 3 dana
    assertEquals('2027-08-14 12:00:00', $r['changes']['current_period_end']); // +1 godina
    assertEquals('2027-08-14', $r['changes']['next_billing_date']);
});
test('trialing --card_payment_success--> active (kartica, period)', function () use ($now) {
    $r = S::apply(sub(['state' => 'trialing']), S::EV_CARD_PAYMENT_SUCCESS,
        ['current_period_end' => '2026-09-14 12:00:00'], $now);
    assertEquals('active', $r['changes']['state']);
    assertEquals('card', $r['changes']['payment_method']);
    assertEquals('2026-09-14 12:00:00', $r['changes']['current_period_end']);
    assertEquals(null, $r['changes']['access_until']);
});
test('active --user_canceled--> canceling (pristup ostaje do perioda)', function () use ($now) {
    $s = sub(['state' => 'active', 'current_period_end' => '2026-09-30 00:00:00']);
    $r = S::apply($s, S::EV_USER_CANCELED, [], $now);
    assertEquals('canceling', $r['changes']['state']);
    assertEquals(1, $r['changes']['cancel_at_period_end']);
    // Posle otkazivanja i dalje ima pristup do kraja perioda:
    $after = array_merge($s, $r['changes']);
    assertTrue(S::hasAccess($after, $now));
});
test('canceling --period_end--> expired', function () use ($now) {
    $r = S::apply(sub(['state' => 'canceling', 'current_period_end' => '2026-08-01 00:00:00']), S::EV_PERIOD_END, [], $now);
    assertEquals('expired', $r['changes']['state']);
});
test('trialing --trial_expired--> expired', function () use ($now) {
    $r = S::apply(sub(['state' => 'trialing']), S::EV_TRIAL_EXPIRED, [], $now);
    assertEquals('expired', $r['changes']['state']);
});

// ── Granični: uplata u poslednjem satu grace perioda ────────────────────────
test('GRANIČNO: uplata 1h pre isteka grace -> active, pristup neprekidan', function () {
    $now = at('2026-08-17 11:00:00'); // access_until je 12:00 istog dana
    $s = sub(['state' => 'pending_payment', 'access_until' => '2026-08-17 12:00:00',
              'current_period_end' => '2027-08-14 12:00:00']);
    assertTrue(S::hasAccess($s, $now)); // pre uplate — pristup radi
    $r = S::apply($s, S::EV_PAYMENT_MATCHED, [], $now);
    assertEquals('active', $r['changes']['state']);
    $after = array_merge($s, $r['changes']);
    assertTrue(S::hasAccess($after, $now)); // posle uplate — i dalje radi
    // Period se NE pomera jer je original još u budućnosti:
    assertTrue(!isset($r['changes']['current_period_end']));
});

// ── Granični: uplata stigne posle gašenja ───────────────────────────────────
test('GRANIČNO: grace istekao -> past_due (pristup ugašen)', function () {
    $now = at('2026-08-17 12:30:00'); // 30 min posle access_until
    $s = sub(['state' => 'pending_payment', 'access_until' => '2026-08-17 12:00:00',
              'current_period_end' => '2027-08-14 12:00:00']);
    assertFalse(S::hasAccess($s, $now)); // rok prošao — hasAccess gasi i pre crona
    $r = S::apply($s, S::EV_ACCESS_EXPIRED, [], $now);
    assertEquals('past_due', $r['changes']['state']);
});
test('GRANIČNO: uplata posle gašenja (past_due, period prošao) -> active + nov period', function () {
    $now = at('2027-09-01 10:00:00'); // i grace i ceo period prošli
    $s = sub(['state' => 'past_due', 'access_until' => '2026-08-17 12:00:00',
              'current_period_end' => '2027-08-14 12:00:00', 'ciklus' => 'godisnje']);
    assertFalse(S::hasAccess($s, $now));
    $r = S::apply($s, S::EV_PAYMENT_MATCHED, [], $now);
    assertEquals('active', $r['changes']['state']);
    // Period je bio prošao -> pomera se od sada (+1 godina):
    assertEquals('2028-09-01 10:00:00', $r['changes']['current_period_end']);
    $after = array_merge($s, $r['changes']);
    assertTrue(S::hasAccess($after, $now));
});

// ── Idempotencija: dupli webhook / dupli cron ───────────────────────────────
test('IDEMPOTENT: dupli card_payment_success -> drugi je noop, ostaje active', function () use ($now) {
    $s = sub(['state' => 'active', 'current_period_end' => '2026-09-14 12:00:00']);
    $r = S::apply($s, S::EV_CARD_PAYMENT_SUCCESS, ['current_period_end' => '2026-09-14 12:00:00'], $now);
    assertTrue($r['noop']); // već active — samo sinhronizacija, bez promene stanja
    assertTrue(!isset($r['changes']['state']));
});
test('IDEMPOTENT: dupli renewal_unpaid -> drugi je noop', function () use ($now) {
    $r = S::apply(sub(['state' => 'pending_payment', 'access_until' => '2026-08-17 12:00:00']), S::EV_RENEWAL_UNPAID, [], $now);
    assertTrue($r['noop']);
});
test('IDEMPOTENT: dupli access_until_expired -> noop', function () use ($now) {
    $r = S::apply(sub(['state' => 'past_due']), S::EV_ACCESS_EXPIRED, [], $now);
    assertTrue($r['noop']);
});

// ── Otkazivanje pa reaktivacija u istom periodu ─────────────────────────────
test('cancel -> reactivate u istom periodu -> active (bez nove fakture/perioda)', function () use ($now) {
    $s = sub(['state' => 'active', 'current_period_end' => '2026-09-30 00:00:00']);
    $c = S::apply($s, S::EV_USER_CANCELED, [], $now);
    $s = array_merge($s, $c['changes']);
    assertEquals('canceling', $s['state']);
    $r = S::apply($s, S::EV_REACTIVATE, [], $now);
    assertEquals('active', $r['changes']['state']);
    assertEquals(0, $r['changes']['cancel_at_period_end']);
    // Period se NE dira -> nema osnova za novu fakturu:
    assertTrue(!isset($r['changes']['current_period_end']));
});
test('reactivate posle isteka perioda baca (ide na checkout)', function () use ($now) {
    $s = sub(['state' => 'canceling', 'current_period_end' => '2026-08-01 00:00:00']);
    assertThrows(InvalidTransitionException::class, fn () => S::apply($s, S::EV_REACTIVATE, [], $now));
});

// ── Nedozvoljeni prelazi ────────────────────────────────────────────────────
test('nedozvoljen prelaz: payment_matched iz trialing baca', function () use ($now) {
    assertThrows(InvalidTransitionException::class, fn () => S::apply(sub(['state' => 'trialing']), S::EV_PAYMENT_MATCHED, [], $now));
});
test('nedozvoljen prelaz: period_end iz active baca', function () use ($now) {
    assertThrows(InvalidTransitionException::class, fn () => S::apply(sub(['state' => 'active', 'current_period_end' => '2026-01-01 00:00:00']), S::EV_PERIOD_END, [], $now));
});

// ── mesečni ciklus ──────────────────────────────────────────────────────────
test('mesečni ciklus: period +1 mesec', function () use ($now) {
    $r = S::apply(sub(['state' => 'trialing', 'ciklus' => 'mesecno']), S::EV_INVOICE_SENT, [], $now);
    assertEquals('2026-09-14 12:00:00', $r['changes']['current_period_end']);
});

summary();
