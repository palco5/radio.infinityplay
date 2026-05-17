<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$currentUser = requireAuth();

$userId = $_GET['id'] ?? '';

if (empty($userId)) {
    sendJSON(['error' => 'User ID is required'], 400);
}

// Get profile
if ($method === 'GET') {
    // Users can only view their own profile unless admin
    if ($currentUser['userId'] !== $userId) {
        $isAdminEmail = in_array($currentUser['email'], ['darkospira@gmail.com', 'info@infinityplay.rs']);

        if (!$isAdminEmail) {
            $db = getDB();
            $stmt = $db->prepare("SELECT is_admin FROM profiles WHERE id = ?");
            $stmt->execute([$currentUser['userId']]);
            $admin = $stmt->fetch();

            if (!$admin || !$admin['is_admin']) {
                sendJSON(['error' => 'Forbidden'], 403);
            }
        }
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, avatar_url,
               bio, phone_number, country_code, subscription_tier, subscription_status,
               theme_preference, email_notifications, newsletter_subscribed, business_category,
               custom_location, jingle_url, jingle_interval_minutes, my_radio_stream_url, is_admin, created_at,
               onboarding_completed, total_listening_minutes, trial_started_at, trial_ends_at, subscription_ends_at, confetti_shown
        FROM profiles WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    if (!$profile) {
        sendJSON(['error' => 'Profile not found'], 404);
    }

    sendJSON(['profile' => $profile]);
}

// Update profile
if ($method === 'PUT' || ($method === 'POST' && isset($_GET['id']))) {
    $db = getDB();

    // Check if current user is admin
    $stmt = $db->prepare("SELECT is_admin FROM profiles WHERE id = ?");
    $stmt->execute([$currentUser['userId']]);
    $adminUser = $stmt->fetch();
    $isAdmin = $adminUser && $adminUser['is_admin'];

    // Emergency Admin Override for specific users
    if ($currentUser['email'] === 'darkospira@gmail.com' || $currentUser['email'] === 'info@infinityplay.rs') {
        $isAdmin = true;
    }

    // Users can only update their own profile unless admin
    if ($currentUser['userId'] !== $userId && !$isAdmin) {
        sendJSON(['error' => 'Forbidden'], 403);
    }

    $data = getRequestBody();

    $updates = [];
    $values = [];

    $allowedFields = [
        'display_name',
        'avatar_url',
        'bio',
        'business_category',
        'custom_location',
        'theme_preference',
        'email_notifications',
        'newsletter_subscribed',
        'jingle_url',
        'jingle_interval_minutes',
        'onboarding_completed',
        'total_listening_minutes',
        'confetti_shown'
    ];

    // Admin-only fields
    if ($isAdmin) {
        $adminFields = [
            'subscription_status',
            'subscription_tier',
            'is_admin',
            'recommended_stations',
            'trial_ends_at',
            'trial_started_at',
            'subscription_ends_at',
            'my_radio_stream_url'
        ];
        $allowedFields = array_merge($allowedFields, $adminFields);
    } else {
        // Permit users to manage trial status with strict constraints
        if (isset($data['subscription_status']) && $data['subscription_status'] === 'trial') {
            // Check if they already had a trial (optional, but good for security)
            // For now, let's just enforce basic constraints
            $data['subscription_tier'] = 'basic-radio'; // Force basic for trial

            // Limit trial to 7 days from now regardless of what they sent
            $trialEndDate = new DateTime();
            $trialEndDate->modify('+7 days');
            $data['trial_ends_at'] = $trialEndDate->format('Y-m-d H:i:s');
            $data['subscription_ends_at'] = $data['trial_ends_at'];
            $data['trial_started_at'] = (new DateTime())->format('Y-m-d H:i:s');

            $allowedFields[] = 'subscription_tier';
            $allowedFields[] = 'trial_ends_at';
            $allowedFields[] = 'subscription_status';
            $allowedFields[] = 'trial_started_at';
            $allowedFields[] = 'subscription_ends_at';
        }
    }

    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            if ($field === 'recommended_stations') {
                $values[] = json_encode($data[$field]);
            } elseif ($field === 'is_admin' || $field === 'newsletter_subscribed' || $field === 'email_notifications' || $field === 'onboarding_completed') {
                $values[] = (int) $data[$field];
            } else {
                $values[] = $data[$field];
            }
        }
    }

    if (empty($updates)) {
        sendJSON(['error' => 'No fields to update'], 400);
    }

    $values[] = $userId;

    $sql = "UPDATE profiles SET " . implode(', ', $updates) . " WHERE id = ?";
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($values);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }

    // Get updated profile
    $stmt = $db->prepare("
        SELECT id, email, username, display_name, first_name, last_name, avatar_url,
               bio, phone_number, country_code, subscription_tier, subscription_status,
               theme_preference, email_notifications, newsletter_subscribed, business_category,
               custom_location, jingle_url, jingle_interval_minutes, my_radio_stream_url, is_admin, created_at,
               trial_ends_at, recommended_stations, onboarding_completed
        FROM profiles WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    if ($profile && $profile['recommended_stations']) {
        $profile['recommended_stations'] = json_decode($profile['recommended_stations']);
    }

    sendJSON(['profile' => $profile]);
}

sendJSON(['error' => 'Method not allowed'], 405);
?>