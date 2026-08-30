<?php
/**
 * Unit testovi PolarMapper-a — Polar događaj -> naš vokabular stanja. Bez baze.
 *   php api/billing/tests/test_polar_mapper.php
 */

require_once __DIR__ . '/harness.php';
require_once __DIR__ . '/../PolarMapper.php';

use Billing\PolarMapper;
use Billing\Subscription;

$tz = new DateTimeZone(Subscription::TZ);
$now = new DateTimeImmutable('2026-08-21 12:00:00', $tz);
$productMap = ['prod_basic' => 'basic-radio', 'prod_branded' => 'branded-radio'];

function sub_data(array $over = []): array {
    return array_merge([
        'id' => 'sub_x1', 'customer_id' => 'ctm_1', 'status' => 'active',
        'product_id' => 'prod_branded',
        'current_period_end' => '2026-09-21T10:00:00Z',
        'cancel_at_period_end' => false,
        'metadata' => ['user_id' => 'u1'],
    ], $over);
}

test('subscription.active -> active + card/polar + period (lokalno) + plan', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.active', sub_data(), $productMap, $now);
    assertEquals(Subscription::ACTIVE, $r['fields']['state']);
    assertEquals('card', $r['fields']['payment_method']);
    assertEquals('polar', $r['fields']['billing_provider']);
    assertEquals('branded-radio', $r['fields']['plan']);
    assertEquals('sub_x1', $r['fields']['provider_subscription_id']);
    assertEquals('ctm_1', $r['fields']['provider_customer_id']);
    // 10:00Z -> 12:00 Europe/Belgrade (letnje, +2)
    assertEquals('2026-09-21 12:00:00', $r['fields']['current_period_end']);
    assertEquals(0, $r['fields']['cancel_at_period_end']);
});
test('subscription.created status trialing -> trialing + trial_ends_at', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.created', sub_data(['status' => 'trialing']), $productMap, $now);
    assertEquals(Subscription::TRIALING, $r['fields']['state']);
    assertTrue(!empty($r['fields']['trial_ends_at']));
});
test('subscription.updated + cancel_at_period_end -> canceling', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.updated', sub_data(['cancel_at_period_end' => true]), $productMap, $now);
    assertEquals(Subscription::CANCELING, $r['fields']['state']);
    assertEquals(1, $r['fields']['cancel_at_period_end']);
});
test('subscription.updated status past_due -> past_due', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.updated', sub_data(['status' => 'past_due']), $productMap, $now);
    assertEquals(Subscription::PAST_DUE, $r['fields']['state']);
});
test('subscription.updated status paused -> past_due', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.updated', sub_data(['status' => 'paused']), $productMap, $now);
    assertEquals(Subscription::PAST_DUE, $r['fields']['state']);
});
test('subscription.canceled, period u budućnosti -> canceling', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.canceled', sub_data(), $productMap, $now);
    assertEquals(Subscription::CANCELING, $r['fields']['state']);
    assertEquals(1, $r['fields']['cancel_at_period_end']);
});
test('subscription.canceled, period u prošlosti -> expired', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.canceled', sub_data(['current_period_end' => '2026-01-01T00:00:00Z']), $productMap, $now);
    assertEquals(Subscription::EXPIRED, $r['fields']['state']);
});
test('subscription.revoked -> expired (pristup oduzet odmah)', function () use ($productMap, $now) {
    $r = PolarMapper::map('subscription.revoked', sub_data(), $productMap, $now);
    assertEquals(Subscription::EXPIRED, $r['fields']['state']);
});
test('nepoznat event -> null (ignoriši)', function () use ($productMap, $now) {
    assertTrue(PolarMapper::map('order.created', sub_data(), $productMap, $now) === null);
    assertTrue(PolarMapper::map('checkout.updated', sub_data(), $productMap, $now) === null);
});
test('nepoznat product id -> plan izostaje (ne pada)', function () use ($now) {
    $r = PolarMapper::map('subscription.active', sub_data(), [], $now);
    assertTrue(!isset($r['fields']['plan']));
});

summary();
