<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = getRequestBody();

    $to = $data['to'] ?? '';
    $subject = $data['subject'] ?? '';
    $html = $data['html'] ?? '';

    if (empty($to) || empty($subject) || empty($html)) {
        sendJSON(['error' => 'Missing required fields'], 400);
    }

    // sendAppMail prefers authenticated SMTP (reliable delivery to Gmail etc.)
    // and falls back to PHP mail() when SMTP is not configured.
    if (sendAppMail($to, $subject, $html)) {
        sendJSON(['success' => true, 'message' => 'Email sent successfully']);
    } else {
        error_log("Failed to send email to $to");
        sendJSON(['error' => 'Failed to send email'], 500);
    }
} else {
    sendJSON(['error' => 'Method not allowed'], 405);
}
?>