<?php
// Database configuration
define('DB_HOST', 'mysql462.loopia.se');
define('DB_NAME', 'infinityplay_rs_db_1');
define('DB_USER', 'infinity@i77893');
define('DB_PASS', 'racivaci10');
define('DB_CHARSET', 'utf8mb4');

// JWT Secret
define('JWT_SECRET', '0c198658aed246fb823265e362d324fbc55236d14f35e240f689b1575c22a58bd02b765dab30d2fd505b1f1aaa719256');

// CORS Settings
define('CORS_ORIGIN', 'https://radio.infinityplay.rs');

// MediaCP API (Now Playing / cover art integration)
define('MEDIACP_API_URL', 'https://media.infinityplay.rs/'); // e.g. https://cp.infinityplay.rs
define('MEDIACP_API_KEY', 'hZ2GeXzUiMudWMRYsHyopFensXZpnFuKnZ-IVsmrV9CZ1nrLpXiEmw=='); // paste the key value here directly, not in chat

// Paddle (billing) — fill these in once your Paddle account is approved.
// PADDLE_CLIENT_TOKEN is safe to expose publicly (it's the client-side token, like a Stripe publishable key).
// PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET are private — never expose them to the frontend.
define('PADDLE_ENVIRONMENT', 'sandbox'); // 'sandbox' while testing, 'production' when live
define('PADDLE_CLIENT_TOKEN', '');       // Paddle > Developer tools > Authentication > Client-side token
define('PADDLE_API_KEY', '');            // Paddle > Developer tools > Authentication > API key (server-side only)
define('PADDLE_WEBHOOK_SECRET', '');     // Paddle > Developer tools > Notifications > your webhook destination > secret key

// Map your internal plan names to the Price IDs you create in Paddle > Catalog > Prices
define('PADDLE_PRICE_BASIC', '');   // Basic Radio plan price ID (pri_...)
define('PADDLE_PRICE_BRANDED', ''); // Branded Radio plan price ID (pri_...)
define('PADDLE_PRICE_HOST', '');    // Host Radio plan price ID (pri_...)

// Error reporting for debugging (disable in production)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Database connection
function getDB()
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }

    return $pdo;
}

// CORS Headers
function setCORSHeaders()
{
    // Allow from any origin for testing, or specific origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }

    // Access-Control headers are received during OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

        exit(0);
    }

    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
}

// Get request body
function getRequestBody()
{
    return json_decode(file_get_contents('php://input'), true);
}

// Send JSON response
function sendJSON($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Generate JWT token
function generateJWT($userId, $email)
{
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'userId' => $userId,
        'email' => $email,
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// Verify JWT token
function verifyJWT($token)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($header, $payload, $signature) = $parts;

    $validSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $validSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));

    if ($signature !== $validSignature) {
        return false;
    }

    $payloadData = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);

    if ($payloadData['exp'] < time()) {
        return false;
    }

    return $payloadData;
}

// Get current user from token
function getCurrentUser()
{
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }

    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (empty($authHeader)) {
        return null;
    }

    $token = str_replace('Bearer ', '', $authHeader);
    return verifyJWT($token);
}

// Require authentication
function requireAuth()
{
    $user = getCurrentUser();
    if (!$user) {
        sendJSON(['error' => 'Unauthorized'], 401);
    }
    return $user;
}

// ─────────────────────────────────────────────────────────────
// Email + verification / password-reset PIN helpers
// ─────────────────────────────────────────────────────────────

// SMTP (Loopia) — authenticated sending through the domain's real mailbox.
// Much more reliable than PHP mail() (Gmail silently drops unauthenticated
// mail). Create/use a mailbox in Loopia (Email) and put its password below.
define('SMTP_HOST', 'mailcluster.loopia.se');
define('SMTP_PORT', 587);
define('SMTP_USER', 'support@infinityplay.rs');
define('SMTP_PASS', 'Sp/R/d0N0v'); // <-- upiši lozinku mail naloga support@infinityplay.rs
define('SMTP_FROM_NAME', 'InfinityPlay Radio');

// Minimal SMTP client with STARTTLS + AUTH LOGIN (no external libraries).
// Returns true on success, false on any failure (details in error_log).
function smtpSendMail($to, $subject, $html)
{
    $host = SMTP_HOST;
    $port = SMTP_PORT;
    $user = SMTP_USER;
    $pass = SMTP_PASS;

    $sock = @fsockopen($host, $port, $errno, $errstr, 15);
    if (!$sock) {
        error_log("smtpSendMail: connect failed: $errno $errstr");
        return false;
    }
    stream_set_timeout($sock, 15);

    $read = function () use ($sock) {
        $data = '';
        while (($line = fgets($sock, 515)) !== false) {
            $data .= $line;
            // Multiline replies: "250-..." continues, "250 ..." ends.
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };
    $send = function ($cmd) use ($sock) {
        fwrite($sock, $cmd . "\r\n");
    };
    $expect = function ($resp, $codes, $step) {
        $code = substr($resp, 0, 3);
        if (!in_array($code, (array) $codes)) {
            error_log("smtpSendMail: unexpected reply at $step: " . trim($resp));
            return false;
        }
        return true;
    };

    try {
        if (!$expect($read(), '220', 'greeting')) return false;

        $send('EHLO infinityplay.rs');
        if (!$expect($read(), '250', 'EHLO')) return false;

        $send('STARTTLS');
        if (!$expect($read(), '220', 'STARTTLS')) return false;
        if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            error_log('smtpSendMail: TLS negotiation failed');
            return false;
        }

        $send('EHLO infinityplay.rs');
        if (!$expect($read(), '250', 'EHLO/TLS')) return false;

        $send('AUTH LOGIN');
        if (!$expect($read(), '334', 'AUTH')) return false;
        $send(base64_encode($user));
        if (!$expect($read(), '334', 'AUTH user')) return false;
        $send(base64_encode($pass));
        if (!$expect($read(), '235', 'AUTH pass')) return false;

        $send("MAIL FROM:<{$user}>");
        if (!$expect($read(), '250', 'MAIL FROM')) return false;
        $send("RCPT TO:<{$to}>");
        if (!$expect($read(), ['250', '251'], 'RCPT TO')) return false;
        $send('DATA');
        if (!$expect($read(), '354', 'DATA')) return false;

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromName = '=?UTF-8?B?' . base64_encode(SMTP_FROM_NAME) . '?=';
        $messageId = '<' . bin2hex(random_bytes(16)) . '@infinityplay.rs>';
        $body = "From: {$fromName} <{$user}>\r\n"
            . "To: <{$to}>\r\n"
            . "Subject: {$encodedSubject}\r\n"
            . "Date: " . date('r') . "\r\n"
            . "Message-ID: {$messageId}\r\n"
            . "MIME-Version: 1.0\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: base64\r\n"
            . "\r\n"
            . chunk_split(base64_encode($html));

        $send($body . "\r\n.");
        if (!$expect($read(), '250', 'message accept')) return false;

        $send('QUIT');
        fclose($sock);
        return true;
    } catch (Exception $e) {
        error_log('smtpSendMail: exception: ' . $e->getMessage());
        @fclose($sock);
        return false;
    }
}

// Send an HTML email from the app. Prefers authenticated SMTP (reliable
// delivery); falls back to PHP mail() when SMTP is not configured or fails.
function sendAppMail($to, $subject, $html)
{
    if (SMTP_PASS !== '') {
        if (smtpSendMail($to, $subject, $html)) {
            return true;
        }
        error_log("sendAppMail: SMTP failed for $to, falling back to mail()");
    }

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: InfinityPlay Radio <support@infinityplay.rs>' . "\r\n";
    $headers .= 'Reply-To: support@infinityplay.rs' . "\r\n";
    $headers .= 'X-Mailer: PHP/' . phpversion();

    $ok = @mail($to, $subject, $html, $headers);
    if (!$ok) {
        error_log("sendAppMail: failed to send to $to");
    }
    return $ok;
}

// Wrap a 6-digit PIN in a branded HTML email. Optionally add a call-to-action
// button (e.g. a link to the reset page) below the code.
function buildPinEmailHtml($heading, $intro, $pin, $note, $ctaUrl = '', $ctaLabel = '')
{
    $cta = '';
    if ($ctaUrl !== '' && $ctaLabel !== '') {
        $cta = '
    <div style="text-align:center;margin:8px 0 24px;">
      <a href="' . htmlspecialchars($ctaUrl) . '" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">' . htmlspecialchars($ctaLabel) . '</a>
    </div>';
    }

    return '
<!DOCTYPE html>
<html lang="sr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:40px auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:16px;">
      <h1 style="color:#10b981;margin:0;">InfinityPlay Radio</h1>
    </div>
    <h2 style="color:#111827;font-size:20px;text-align:center;">' . htmlspecialchars($heading) . '</h2>
    <p style="font-size:16px;color:#374151;line-height:1.5;">' . htmlspecialchars($intro) . '</p>
    <div style="text-align:center;margin:28px 0 8px;">
      <div style="display:inline-block;font-size:36px;letter-spacing:10px;font-weight:bold;color:#10b981;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px 28px;">' . htmlspecialchars($pin) . '</div>
    </div>' . $cta . '
    <p style="font-size:14px;color:#9ca3af;text-align:center;">' . htmlspecialchars($note) . '</p>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px;">Ako niste vi zatražili ovaj kod, ignorišite ovaj email.</p>
  </div>
</body>
</html>';
}

// Make sure the email_codes table exists (self-heal for older DBs).
function ensureEmailCodesTable($db)
{
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS email_codes (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            purpose VARCHAR(32) NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            used TINYINT NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email_purpose (email, purpose)
        )");
    } catch (Exception $e) { /* ignore */ }
}

// Issue a fresh 6-digit PIN for (email, purpose): invalidates older codes,
// stores a bcrypt hash, and returns the plaintext code (to be emailed only).
function issueEmailCode($db, $email, $purpose, $ttlMinutes = 15)
{
    ensureEmailCodesTable($db);

    // Invalidate any previous codes for this email + purpose.
    $stmt = $db->prepare("UPDATE email_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0");
    $stmt->execute([$email, $purpose]);

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash = password_hash($code, PASSWORD_BCRYPT);
    $expires = (new DateTime("+{$ttlMinutes} minutes"))->format('Y-m-d H:i:s');

    $stmt = $db->prepare("INSERT INTO email_codes (email, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)");
    $stmt->execute([$email, $hash, $purpose, $expires]);

    // Local-testing aid only: when EMAIL_CODE_DEBUG is defined & true (never in
    // production config) log the plaintext PIN so it can be read without email.
    if (defined('EMAIL_CODE_DEBUG') && EMAIL_CODE_DEBUG) {
        error_log("[EMAIL_CODE_DEBUG] {$purpose} code for {$email} = {$code}");
    }

    return $code;
}

// Verify a submitted PIN for (email, purpose). Returns true on success. Wrong
// tries increment attempts; after 5 the code locks. When $consume is true the
// code is marked used on success (single-use); pass false to only validate it
// without consuming (e.g. checking a reset PIN before asking for the new
// password, so the same PIN can still be used to actually reset it).
function verifyEmailCode($db, $email, $purpose, $code, $consume = true)
{
    ensureEmailCodesTable($db);

    $stmt = $db->prepare("SELECT id, code_hash, attempts, expires_at FROM email_codes
        WHERE email = ? AND purpose = ? AND used = 0
        ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email, $purpose]);
    $row = $stmt->fetch();

    if (!$row) {
        return false;
    }
    if (strtotime($row['expires_at']) < time()) {
        return false;
    }
    if ((int) $row['attempts'] >= 5) {
        // Too many attempts — lock this code.
        $db->prepare("UPDATE email_codes SET used = 1 WHERE id = ?")->execute([$row['id']]);
        return false;
    }

    if (password_verify((string) $code, $row['code_hash'])) {
        if ($consume) {
            $db->prepare("UPDATE email_codes SET used = 1 WHERE id = ?")->execute([$row['id']]);
        }
        return true;
    }

    // Wrong code — count the attempt, lock if it was the last allowed try.
    $newAttempts = (int) $row['attempts'] + 1;
    $used = $newAttempts >= 5 ? 1 : 0;
    $db->prepare("UPDATE email_codes SET attempts = ?, used = ? WHERE id = ?")
        ->execute([$newAttempts, $used, $row['id']]);
    return false;
}

// Generate UUID v4
function generateUUID()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}
?>