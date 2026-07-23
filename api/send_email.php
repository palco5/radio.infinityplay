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

    // Email headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: InfinityPlay Radio <support@infinityplay.rs>' . "\r\n";
    $headers .= 'Reply-To: support@infinityplay.rs' . "\r\n";
    $headers .= 'X-Mailer: PHP/' . phpversion();

    // Use PHP mail() function which works on standard hosting environments like Loopia
    if (mail($to, $subject, $html, $headers)) {
        sendJSON(['success' => true, 'message' => 'Email sent successfully']);
    } else {
        // Fallback or error logging
        error_log("Failed to send email to $to");
        sendJSON(['error' => 'Failed to send email'], 500);
    }
} else {
    sendJSON(['error' => 'Method not allowed'], 405);
}
?>