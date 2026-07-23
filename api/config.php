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