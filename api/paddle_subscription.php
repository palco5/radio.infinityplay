<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'cancel') {
    $currentUser = requireAuth();

    $db = getDB();
    $stmt = $db->prepare("SELECT paddle_subscription_id FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);
    $row = $stmt->fetch();

    $subscriptionId = $row['paddle_subscription_id'] ?? null;
    if (!$subscriptionId) {
        sendJSON(['error' => 'Nema aktivne pretplate za otkazivanje'], 400);
    }
    if (!PADDLE_API_KEY) {
        sendJSON(['error' => 'Paddle nije podešen na serveru (nedostaje API ključ)'], 500);
    }

    // Cancels at the end of the current billing period by default — matches
    // what our Terms of Service / Refund Policy promise the customer.
    $context = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Authorization: Bearer " . PADDLE_API_KEY . "\r\nContent-Type: application/json",
            'content' => json_encode(new stdClass()),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $paddleApiBase = PADDLE_ENVIRONMENT === 'production'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com';

    $response = @file_get_contents(
        $paddleApiBase . '/subscriptions/' . rawurlencode($subscriptionId) . '/cancel',
        false,
        $context
    );

    $statusLine = $http_response_header[0] ?? '';
    $ok = (bool) preg_match('#HTTP/\S+\s+2\d\d#', $statusLine);

    if (!$ok) {
        sendJSON(['error' => 'Paddle je odbio zahtev za otkazivanje', 'details' => $response], 502);
    }

    // Reflect the pending cancellation immediately; the webhook will confirm
    // the final status change once Paddle processes it at period end.
    $stmt = $db->prepare("UPDATE profiles SET cancel_at_period_end = 1 WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);

    sendJSON(['success' => true, 'message' => 'Pretplata će biti otkazana na kraju tekućeg perioda']);
}

sendJSON(['error' => 'Not found'], 404);
