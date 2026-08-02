<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['path']) ? $_GET['path'] : '';

// Self-heal: add Paddle billing columns if this DB predates them
try {
    $db = getDB();
    $db->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(64)");
    $db->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(64)");
    // Email verification (blocking) — 0 = not verified, 1 = verified.
    // Add the column only if missing, and backfill existing accounts to
    // verified (they predate verification and must not get locked out).
    $hasCol = $db->query("SHOW COLUMNS FROM profiles LIKE 'email_verified'")->fetch();
    if (!$hasCol) {
        $db->exec("ALTER TABLE profiles ADD COLUMN email_verified TINYINT NOT NULL DEFAULT 0");
        $db->exec("UPDATE profiles SET email_verified = 1");
    }
    ensureEmailCodesTable($db);
} catch (Exception $e) { /* ignore */ }

// Register
if ($method === 'POST' && $path === 'register') {
    $data = getRequestBody();

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $first_name = $data['first_name'] ?? '';
    $last_name = $data['last_name'] ?? '';
    $phone_number = $data['phone_number'] ?? '';
    $country_code = $data['country_code'] ?? 'RS';
    $venue_name = $data['venue_name'] ?? '';

    if (empty($email) || empty($password)) {
        sendJSON(['error' => 'Email and password are required'], 400);
    }

    $db = getDB();

    // Check if user exists
    $stmt = $db->prepare("SELECT id FROM profiles WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendJSON(['error' => 'User already exists'], 400);
    }

    // Create user
    $userId = bin2hex(random_bytes(16));
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $username = explode('@', $email)[0];

    try {
        $stmt = $db->prepare("
            INSERT INTO profiles (id, email, password, username, display_name, first_name, last_name, phone_number, country_code, venue_name, subscription_status, subscription_tier, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', 'none', 0)
        ");

        $stmt->execute([
            $userId,
            $email,
            $hashedPassword,
            $username,
            $username,
            $first_name,
            $last_name,
            $phone_number,
            $country_code,
            $venue_name
        ]);
    } catch (PDOException $e) {
        sendJSON(['error' => 'DB Insert failed: ' . $e->getMessage()], 500);
    }

    // Issue an email-verification PIN and send it. No token is returned until
    // the user verifies their email (blocking verification).
    $code = issueEmailCode($db, $email, 'verify_email');
    $name = $first_name ?: $username;
    $html = buildPinEmailHtml(
        'Verifikacija email adrese',
        "Pozdrav {$name}, hvala na registraciji! Unesite ovaj kod da potvrdite svoju email adresu:",
        $code,
        'Kod važi 15 minuta.'
    );
    sendAppMail($email, 'Vaš kod za verifikaciju - InfinityPlay Radio', $html);

    // Return the created user (no token) so admin tooling can follow up with a
    // profile update. Self-signup must still verify the email PIN before login.
    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, is_admin, subscription_tier
        FROM profiles WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    sendJSON([
        'requiresVerification' => true,
        'email' => $email,
        'user' => $user,
        'debug_code' => (defined('EMAIL_CODE_DEBUG') && EMAIL_CODE_DEBUG) ? $code : null
    ], 201);
}

// Verify email with PIN → activates the account and returns a login token.
if ($method === 'POST' && $path === 'verify-email') {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');

    if (empty($email) || empty($code)) {
        sendJSON(['error' => 'Email i kod su obavezni'], 400);
    }

    $db = getDB();

    if (!verifyEmailCode($db, $email, 'verify_email', $code)) {
        sendJSON(['error' => 'Kod je netačan ili je istekao'], 400);
    }

    $db->prepare("UPDATE profiles SET email_verified = 1 WHERE email = ?")->execute([$email]);

    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, is_admin, subscription_tier
        FROM profiles WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJSON(['error' => 'Korisnik nije pronađen'], 404);
    }

    $token = generateJWT($user['id'], $user['email']);
    sendJSON(['user' => $user, 'token' => $token]);
}

// Resend a verification PIN.
if ($method === 'POST' && $path === 'resend-code') {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        sendJSON(['error' => 'Email je obavezan'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT first_name, username, email_verified FROM profiles WHERE email = ?");
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    // Respond 200 regardless (avoid leaking which emails exist). Only actually
    // send when the account exists and is still unverified.
    if ($row && (int) $row['email_verified'] === 0) {
        $code = issueEmailCode($db, $email, 'verify_email');
        $name = $row['first_name'] ?: ($row['username'] ?: 'korisniče');
        $html = buildPinEmailHtml(
            'Verifikacija email adrese',
            "Pozdrav {$name}, unesite ovaj kod da potvrdite svoju email adresu:",
            $code,
            'Kod važi 15 minuta.'
        );
        sendAppMail($email, 'Vaš kod za verifikaciju - InfinityPlay Radio', $html);
    }

    sendJSON([
        'success' => true,
        'debug_code' => (defined('EMAIL_CODE_DEBUG') && EMAIL_CODE_DEBUG && isset($code)) ? $code : null
    ]);
}

// Request a password-reset PIN (used by both the login "forgot password"
// flow and the admin "send reset" button). Always 200 to avoid enumeration.
if ($method === 'POST' && $path === 'request-reset') {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        sendJSON(['error' => 'Email je obavezan'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT first_name, username FROM profiles WHERE email = ?");
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    if ($row) {
        $code = issueEmailCode($db, $email, 'password_reset');
        $name = $row['first_name'] ?: ($row['username'] ?: 'korisniče');
        $resetUrl = 'https://radio.infinityplay.rs/reset-password?email=' . urlencode($email) . '&sent=1';
        $html = buildPinEmailHtml(
            'Resetovanje lozinke',
            "Pozdrav {$name}, primili smo zahtev za resetovanje lozinke. Unesite ovaj kod na stranici za resetovanje da postavite novu lozinku:",
            $code,
            'Kod važi 15 minuta.',
            $resetUrl,
            'Unesi kod'
        );
        sendAppMail($email, 'Kod za resetovanje lozinke - InfinityPlay Radio', $html);
    }

    sendJSON([
        'success' => true,
        'debug_code' => (defined('EMAIL_CODE_DEBUG') && EMAIL_CODE_DEBUG && isset($code)) ? $code : null
    ]);
}

// Validate a password-reset PIN WITHOUT consuming it (used by the reset
// wizard's PIN step, before the new password is entered).
if ($method === 'POST' && $path === 'verify-reset-code') {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');

    if (empty($email) || empty($code)) {
        sendJSON(['error' => 'Email i kod su obavezni'], 400);
    }

    $db = getDB();

    if (!verifyEmailCode($db, $email, 'password_reset', $code, false)) {
        sendJSON(['error' => 'Kod je netačan ili je istekao'], 400);
    }

    sendJSON(['valid' => true]);
}

// Reset password with a PIN.
if ($method === 'POST' && $path === 'reset-password') {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');
    $newPassword = $data['newPassword'] ?? '';

    if (empty($email) || empty($code) || empty($newPassword)) {
        sendJSON(['error' => 'Email, kod i nova lozinka su obavezni'], 400);
    }
    if (strlen($newPassword) < 6) {
        sendJSON(['error' => 'Lozinka mora imati najmanje 6 karaktera'], 400);
    }

    $db = getDB();

    if (!verifyEmailCode($db, $email, 'password_reset', $code)) {
        sendJSON(['error' => 'Kod je netačan ili je istekao'], 400);
    }

    $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
    // Reset also confirms ownership of the inbox, so mark the email verified.
    $stmt = $db->prepare("UPDATE profiles SET password = ?, email_verified = 1 WHERE email = ?");
    $stmt->execute([$hashed, $email]);

    sendJSON(['success' => true, 'message' => 'Lozinka je uspešno promenjena']);
}

// Login
if ($method === 'POST' && $path === 'login') {
    $data = getRequestBody();

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendJSON(['error' => 'Email and password are required'], 400);
    }

    $db = getDB();

    // Find user
    $stmt = $db->prepare("SELECT * FROM profiles WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        sendJSON(['error' => 'Invalid credentials'], 401);
    }

    // Blocking email verification: unverified accounts cannot log in. Send a
    // fresh code so the user can complete verification from the login screen.
    if (isset($user['email_verified']) && (int) $user['email_verified'] === 0) {
        $code = issueEmailCode($db, $user['email'], 'verify_email');
        $name = $user['first_name'] ?: ($user['username'] ?: 'korisniče');
        $html = buildPinEmailHtml(
            'Verifikacija email adrese',
            "Pozdrav {$name}, unesite ovaj kod da potvrdite svoju email adresu:",
            $code,
            'Kod važi 15 minuta.'
        );
        sendAppMail($user['email'], 'Vaš kod za verifikaciju - InfinityPlay Radio', $html);
        sendJSON([
            'error' => 'Email nije verifikovan',
            'requiresVerification' => true,
            'email' => $user['email'],
            'debug_code' => (defined('EMAIL_CODE_DEBUG') && EMAIL_CODE_DEBUG) ? $code : null
        ], 403);
    }

    // Generate token
    $token = generateJWT($user['id'], $user['email']);

    unset($user['password']); // Don't send password

    sendJSON([
        'user' => $user,
        'token' => $token
    ]);
}

// Get current user
if ($method === 'GET' && $path === 'me') {
    $currentUser = requireAuth();

    $db = getDB();
    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, avatar_url,
               is_admin, subscription_tier, business_category, phone_number, country_code,
               theme_preference, email_notifications, newsletter_subscribed, jingle_url, jingle_interval_minutes
        FROM profiles WHERE id = ?
    ");
    $stmt->execute([$currentUser['userId']]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJSON(['error' => 'User not found'], 404);
    }

    sendJSON(['user' => $user]);
}

// Get all users (Admin only)
if ($method === 'GET' && $path === 'users') {
    $currentUser = requireAuth();

    $db = getDB();

    // Check admin status
    $stmt = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);
    $admin = $stmt->fetch();

    if ((!$admin || !$admin['is_admin']) && $admin['email'] !== 'darkospira@gmail.com' && $admin['email'] !== 'info@infinityplay.rs') {
        sendJSON(['error' => 'Forbidden'], 403);
    }

    $stmt = $db->query("
        SELECT id, email, username, display_name, first_name, last_name, avatar_url,
               is_admin, subscription_tier, subscription_status, business_category,
               created_at, trial_ends_at, newsletter_subscribed, my_radio_stream_url,
               custom_location, venue_name, jingle_interval_minutes
        FROM profiles
        ORDER BY created_at DESC
    ");
    $users = $stmt->fetchAll();

    sendJSON(['users' => $users]);
}

// Change password
if ($method === 'POST' && $path === 'change-password') {
    $currentUser = requireAuth();
    $data = getRequestBody();

    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        sendJSON(['error' => 'Trenutna i nova lozinka su obavezne'], 400);
    }
    if (strlen($newPassword) < 8) {
        sendJSON(['error' => 'Nova lozinka mora imati bar 8 karaktera'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT password FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, $row['password'])) {
        sendJSON(['error' => 'Trenutna lozinka nije tačna'], 401);
    }

    $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE profiles SET password = ? WHERE id = ?");
    $stmt->execute([$hashed, $currentUser['userId']]);

    sendJSON(['success' => true, 'message' => 'Lozinka je uspešno promenjena']);
}

// Delete own account
if ($method === 'POST' && $path === 'delete-account') {
    $currentUser = requireAuth();
    $data = getRequestBody();

    $password = $data['password'] ?? '';
    if (empty($password)) {
        sendJSON(['error' => 'Lozinka je obavezna za potvrdu brisanja naloga'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT password FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, $row['password'])) {
        sendJSON(['error' => 'Lozinka nije tačna'], 401);
    }

    // remote_sessions has no FK cascade — clean it up explicitly.
    // favorites / listening_sessions / user_jingles cascade via FK on profiles delete.
    $stmt = $db->prepare("DELETE FROM remote_sessions WHERE user_id = ?");
    $stmt->execute([$currentUser['userId']]);

    $stmt = $db->prepare("DELETE FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);

    sendJSON(['success' => true, 'message' => 'Nalog je obrisan']);
}

sendJSON(['error' => 'Not found'], 404);
?>