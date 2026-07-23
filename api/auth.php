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
            INSERT INTO profiles (id, email, password, username, display_name, first_name, last_name, phone_number, country_code, venue_name, subscription_status, subscription_tier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', 'none')
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

    // Get created user
    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, is_admin, subscription_tier
        FROM profiles WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    // Generate token
    $token = generateJWT($user['id'], $user['email']);

    sendJSON([
        'user' => $user,
        'token' => $token
    ], 201);
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