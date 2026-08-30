<?php
// Local dev override (gitignored): kad postoji api/config.local.php, on prvi
// definiše konstante (npr. lokalni DB), pa donji `if (!defined(...))` čuvaju te
// vrednosti. U produkciji fajl ne postoji -> primenjuju se podrazumevane vrednosti
// ispod i živi sajt je netaknut.
if (is_file(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// Database configuration
if (!defined('DB_HOST'))    define('DB_HOST', 'mysql462.loopia.se');
if (!defined('DB_NAME'))    define('DB_NAME', 'infinityplay_rs_db_1');
if (!defined('DB_USER'))    define('DB_USER', 'infinity@i77893');
if (!defined('DB_PASS'))    define('DB_PASS', 'racivaci10');
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

// JWT Secret
if (!defined('JWT_SECRET')) define('JWT_SECRET', '0c198658aed246fb823265e362d324fbc55236d14f35e240f689b1575c22a58bd02b765dab30d2fd505b1f1aaa719256');

// CORS Settings
if (!defined('CORS_ORIGIN')) define('CORS_ORIGIN', 'https://radio.infinityplay.rs');

// MediaCP API (Now Playing / cover art integration)
define('MEDIACP_API_URL', 'https://media.infinityplay.rs/'); // e.g. https://cp.infinityplay.rs
define('MEDIACP_API_KEY', 'hZ2GeXzUiMudWMRYsHyopFensXZpnFuKnZ-IVsmrV9CZ1nrLpXiEmw=='); // paste the key value here directly, not in chat
// Kad je true, "blokiraj" NE briše stvarno iz MediaCP-a nego samo zabeleži u log
// šta bi obrisao (za bezbedno testiranje na localhostu). Produkcija = false.
if (!defined('MEDIACP_DELETE_DRYRUN')) define('MEDIACP_DELETE_DRYRUN', false);

// ── Kartično plaćanje: Polar.sh (merchant of record) ─────────────────────────
// Naziv provajdera na JEDNOM mestu — pravne stranice i checkout tekst ga čitaju
// odavde, pa buduća promena ide u jednu liniju (ne po 5 fajlova).
if (!defined('MOR_PROVIDER_NAME'))  define('MOR_PROVIDER_NAME', 'Polar');
if (!defined('MOR_PROVIDER_LEGAL')) define('MOR_PROVIDER_LEGAL', 'Polar Software Inc.');
if (!defined('MOR_PROVIDER_URL'))   define('MOR_PROVIDER_URL', 'https://polar.sh');

// POLAR_ACCESS_TOKEN i POLAR_WEBHOOK_SECRET su privatni — nikad na frontend.
// Produkcijske vrednosti (kartično plaćanje je uživo). Na localhostu ih
// config.local.php pregazi po potrebi.
if (!defined('POLAR_ENVIRONMENT'))    define('POLAR_ENVIRONMENT', 'production'); // 'sandbox' | 'production'
if (!defined('POLAR_ACCESS_TOKEN'))   define('POLAR_ACCESS_TOKEN', 'polar_oat_DBwdKMHSujvu3c9FC9G5YqVefXS0Fc2Dok8VF4CN9gR');
if (!defined('POLAR_WEBHOOK_SECRET')) define('POLAR_WEBHOOK_SECRET', 'whsec_8FOQERTB3eNPISBXmdCtG7gGUujMId2VkxgED2qGExN');

// Product ID-evi iz Polar-a (Products). Mesečni:
if (!defined('POLAR_PRODUCT_BASIC'))    define('POLAR_PRODUCT_BASIC', '256adf74-cd27-4e6c-949a-ba13fdb5dc32');
if (!defined('POLAR_PRODUCT_BRANDED'))  define('POLAR_PRODUCT_BRANDED', '432eb9c4-7fff-45e6-9cc8-f4effe415a84');
if (!defined('POLAR_PRODUCT_HOST'))     define('POLAR_PRODUCT_HOST', '');
// Godišnji (zaseban product/price sa godišnjim billing period-om):
if (!defined('POLAR_PRODUCT_BASIC_ANNUAL'))   define('POLAR_PRODUCT_BASIC_ANNUAL', '6560a378-340f-4add-8101-ab8b3bcabf1c');
if (!defined('POLAR_PRODUCT_BRANDED_ANNUAL')) define('POLAR_PRODUCT_BRANDED_ANNUAL', '33cb1af0-2f99-41a3-912f-9f08e2b6d321');
if (!defined('POLAR_PRODUCT_HOST_ANNUAL'))    define('POLAR_PRODUCT_HOST_ANNUAL', '49c63a67-80b2-4a66-be59-26c1767aea50');

// ─────────────────────────────────────────────────────────────
// Billing — plaćanje po fakturi (e-faktura na SEF)
// Guarded define -> api/config.local.php može da ih pregazi za lokalni razvoj.
// ─────────────────────────────────────────────────────────────
// SEF (Sistem elektronskih faktura). Ključ se generiše na SEF portalu i važi
// samo za okruženje na kom je generisan (demo ključ ne radi na produkciji).
if (!defined('SEF_ENVIRONMENT')) define('SEF_ENVIRONMENT', 'demo'); // 'demo' | 'production'
if (!defined('SEF_API_KEY'))     define('SEF_API_KEY', '');          // prazno = SEF isključen (samo mejl)

// Podaci naše firme (idu na svaku fakturu). Popuni pre produkcije.
if (!defined('COMPANY_NAZIV'))     define('COMPANY_NAZIV', 'Infinity Play');
if (!defined('COMPANY_PIB'))       define('COMPANY_PIB', '');
if (!defined('COMPANY_MB'))        define('COMPANY_MB', '');
if (!defined('COMPANY_ADRESA'))    define('COMPANY_ADRESA', 'Ilije Bosilja 7/11');
if (!defined('COMPANY_GRAD'))      define('COMPANY_GRAD', 'Novi Beograd');
if (!defined('COMPANY_PTT'))       define('COMPANY_PTT', '11070');
if (!defined('COMPANY_EMAIL'))     define('COMPANY_EMAIL', 'info@infinityplay.rs');
if (!defined('COMPANY_TELEFON'))   define('COMPANY_TELEFON', '069602902');
if (!defined('COMPANY_RACUN'))     define('COMPANY_RACUN', '');      // 18 cifara, bez crtica
if (!defined('COMPANY_U_SISTEMU_PDV')) define('COMPANY_U_SISTEMU_PDV', true);

// Naplata
if (!defined('BILLING_ROK_PLACANJA_DANA')) define('BILLING_ROK_PLACANJA_DANA', 5);
// Koliko dana pre isteka perioda se generiše faktura za obnovu.
if (!defined('BILLING_RENEWAL_LEAD_DANI')) define('BILLING_RENEWAL_LEAD_DANI', 7);
// Folder u koji banka/e-banking sprema camt.053 XML izvode za dnevni uvoz.
// Cron ih obradi i premesti obrađene u podfolder 'done'. Prazno = uvoz isključen.
if (!defined('BILLING_STATEMENTS_DIR')) define('BILLING_STATEMENTS_DIR', '');

// Pretraga firme po PIB-u (auto-popuna na checkout formi). Besplatni javni izvori
// (APR/NBS) blokiraju automatski pristup, pa je potreban komercijalni API.
// Kad dobiješ nalog/ključ, popuni ovo pa auto-popuna proradi (vidi api/pib_lookup.php).
if (!defined('PIB_LOOKUP_URL')) define('PIB_LOOKUP_URL', '');  // npr. https://provider.rs/api/company
if (!defined('PIB_LOOKUP_KEY')) define('PIB_LOOKUP_KEY', '');  // API ključ provajdera
// Kad je true, mejlovi se ne šalju stvarno (samo se loguju) — za lokalni razvoj.
if (!defined('BILLING_EMAIL_DRYRUN')) define('BILLING_EMAIL_DRYRUN', false);
// Token kojim Loopia URL-cron štiti worker/cron endpoint od javnog okidanja.
if (!defined('BILLING_CRON_TOKEN')) define('BILLING_CRON_TOKEN', '');

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
        'exp' => time() + (365 * 24 * 60 * 60) // 1 godina — da se korisnici ne izloguju sami
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
// $attachments: [ ['filename'=>..., 'content'=>binary, 'mime'=>'application/pdf'], ... ]
function smtpSendMail($to, $subject, $html, $attachments = [])
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

        $headers = "From: {$fromName} <{$user}>\r\n"
            . "To: <{$to}>\r\n"
            . "Subject: {$encodedSubject}\r\n"
            . "Date: " . date('r') . "\r\n"
            . "Message-ID: {$messageId}\r\n"
            . "MIME-Version: 1.0\r\n";

        if (!empty($attachments)) {
            // multipart/mixed: HTML deo + jedan ili više priloga (npr. PDF faktura).
            $boundary = 'b_' . bin2hex(random_bytes(12));
            $body = $headers
                . "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n\r\n"
                . "--{$boundary}\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: base64\r\n\r\n"
                . chunk_split(base64_encode($html)) . "\r\n";
            foreach ($attachments as $att) {
                $fname = preg_replace('/[^\w.\- ]+/u', '_', (string) ($att['filename'] ?? 'prilog'));
                $mime = $att['mime'] ?? 'application/octet-stream';
                $body .= "--{$boundary}\r\n"
                    . "Content-Type: {$mime}; name=\"{$fname}\"\r\n"
                    . "Content-Transfer-Encoding: base64\r\n"
                    . "Content-Disposition: attachment; filename=\"{$fname}\"\r\n\r\n"
                    . chunk_split(base64_encode((string) ($att['content'] ?? ''))) . "\r\n";
            }
            $body .= "--{$boundary}--";
        } else {
            $body = $headers
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: base64\r\n"
                . "\r\n"
                . chunk_split(base64_encode($html));
        }

        // U SMTP DATA telu, red koji počinje tačkom mora biti "dot-stuffed".
        $body = preg_replace('/^\./m', '..', $body);
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
function sendAppMail($to, $subject, $html, $attachments = [])
{
    if (SMTP_PASS !== '') {
        if (smtpSendMail($to, $subject, $html, $attachments)) {
            return true;
        }
        error_log("sendAppMail: SMTP failed for $to, falling back to mail()");
    }
    // mail() fallback ne šalje priloge — degradira na samo HTML (bolje nego ništa).

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