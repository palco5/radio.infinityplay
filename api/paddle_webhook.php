<?php
require_once 'config.php';

header('Content-Type: application/json');

// Paddle sends the raw body + a `Paddle-Signature` header formatted as
// "ts=<unix_timestamp>;h1=<hex_hmac_sha256>". We must hash the *raw* body —
// never re-encode/re-decode it — or the signature will never match.
$rawBody = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_PADDLE_SIGNATURE'] ?? '';

if (!PADDLE_WEBHOOK_SECRET || !verifyPaddleSignature($rawBody, $signatureHeader, PADDLE_WEBHOOK_SECRET)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($rawBody, true);
if (!is_array($event) || empty($event['event_type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Malformed payload']);
    exit;
}

$eventType = $event['event_type'];
$data = $event['data'] ?? [];

try {
    switch ($eventType) {
        case 'subscription.created':
        case 'subscription.activated':
        case 'subscription.updated':
        case 'subscription.resumed':
        case 'subscription.trialing':
            handleSubscriptionUpsert($data);
            break;

        case 'subscription.canceled':
            handleSubscriptionCanceled($data);
            break;

        case 'subscription.paused':
        case 'subscription.past_due':
            handleSubscriptionStatusOnly($data, $eventType === 'subscription.paused' ? 'paused' : 'past_due');
            break;

        default:
            // Nothing to do for transaction.* / customer.* etc — subscription.*
            // events already carry everything we need to keep profiles in sync.
            break;
    }
} catch (Exception $e) {
    error_log('Paddle webhook handling failed: ' . $e->getMessage());
    // Still return 200 below — we don't want Paddle endlessly retrying a
    // payload our own code is choking on. The error is logged for us to fix.
}

http_response_code(200);
echo json_encode(['success' => true]);

function verifyPaddleSignature($rawBody, $signatureHeader, $secret)
{
    if (!$signatureHeader || !$rawBody) {
        return false;
    }

    $parts = [];
    foreach (explode(';', $signatureHeader) as $part) {
        [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
        if ($key !== null && $value !== null) {
            $parts[$key] = $value;
        }
    }

    $timestamp = $parts['ts'] ?? null;
    $providedSignature = $parts['h1'] ?? null;
    if (!$timestamp || !$providedSignature) {
        return false;
    }

    $signedPayload = $timestamp . ':' . $rawBody;
    $computedSignature = hash_hmac('sha256', $signedPayload, $secret);

    return hash_equals($computedSignature, $providedSignature);
}

// Map a Paddle price ID (from our own catalog config) to our internal tier name.
function tierFromPriceId($priceId)
{
    $map = [
        PADDLE_PRICE_BASIC   => 'basic-radio',
        PADDLE_PRICE_BRANDED => 'branded-radio',
        PADDLE_PRICE_HOST    => 'host-radio',
    ];
    return $map[$priceId] ?? null;
}

// Find the user this event belongs to: prefer the custom_data.user_id we
// pass through at checkout time, falling back to a previously-stored
// paddle_customer_id for events that don't carry custom_data (e.g. renewals).
function findUserIdForSubscription($data)
{
    $db = getDB();

    $userId = $data['custom_data']['user_id'] ?? null;
    if ($userId) {
        $stmt = $db->prepare("SELECT id FROM profiles WHERE id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            return $userId;
        }
    }

    $customerId = $data['customer_id'] ?? null;
    if ($customerId) {
        $stmt = $db->prepare("SELECT id FROM profiles WHERE paddle_customer_id = ?");
        $stmt->execute([$customerId]);
        $row = $stmt->fetch();
        if ($row) {
            return $row['id'];
        }
    }

    return null;
}

function handleSubscriptionUpsert($data)
{
    $userId = findUserIdForSubscription($data);
    if (!$userId) {
        error_log('Paddle webhook: could not resolve user for subscription ' . ($data['id'] ?? 'unknown'));
        return;
    }

    $priceId = $data['items'][0]['price']['id'] ?? null;
    $tier = $priceId ? tierFromPriceId($priceId) : null;

    $status = ($data['status'] ?? '') === 'trialing' ? 'trial' : 'active';
    $endsAt = $data['current_billing_period']['ends_at'] ?? ($data['next_billed_at'] ?? null);
    $endsAt = $endsAt ? gmdate('Y-m-d H:i:s', strtotime($endsAt)) : null;

    $db = getDB();
    $fields = [
        'subscription_status = ?',
        'subscription_ends_at = ?',
        'paddle_customer_id = ?',
        'paddle_subscription_id = ?',
        'cancel_at_period_end = ?',
    ];
    $values = [
        $status,
        $endsAt,
        $data['customer_id'] ?? null,
        $data['id'] ?? null,
        !empty($data['scheduled_change']) && ($data['scheduled_change']['action'] ?? '') === 'cancel' ? 1 : 0,
    ];

    if ($tier) {
        $fields[] = 'subscription_tier = ?';
        $values[] = $tier;
    }

    $values[] = $userId;

    $stmt = $db->prepare("UPDATE profiles SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
}

function handleSubscriptionCanceled($data)
{
    $userId = findUserIdForSubscription($data);
    if (!$userId) {
        error_log('Paddle webhook: could not resolve user for canceled subscription ' . ($data['id'] ?? 'unknown'));
        return;
    }

    $db = getDB();
    $stmt = $db->prepare("
        UPDATE profiles
        SET subscription_status = 'canceled', cancel_at_period_end = 0
        WHERE id = ?
    ");
    $stmt->execute([$userId]);
}

function handleSubscriptionStatusOnly($data, $status)
{
    $userId = findUserIdForSubscription($data);
    if (!$userId) {
        return;
    }

    $db = getDB();
    $stmt = $db->prepare("UPDATE profiles SET subscription_status = ? WHERE id = ?");
    $stmt->execute([$status, $userId]);
}
