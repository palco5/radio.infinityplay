<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['path']) ? $_GET['path'] : '';

// Register
if ($method === 'POST' && $path === 'register') {
    $data = getRequestBody();

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $first_name = $data['first_name'] ?? '';
    $last_name = $data['last_name'] ?? '';
    $phone_number = $data['phone_number'] ?? '';
    $country_code = $data['country_code'] ?? 'RS';

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

    $stmt = $db->prepare("
        INSERT INTO profiles (id, email, password, username, display_name, first_name, last_name, phone_number, country_code, subscription_status, subscription_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', 'none')
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
        $country_code
    ]);

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
               custom_location, jingle_interval_minutes
        FROM profiles
        ORDER BY created_at DESC
    ");
    $users = $stmt->fetchAll();

    sendJSON(['users' => $users]);
}

sendJSON(['error' => 'Not found'], 404);
?>