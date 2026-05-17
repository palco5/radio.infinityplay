<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$currentUser = requireAuth();
$userId = $currentUser['userId'];

// Auto-create table if not exists (Self-healing)
$db = getDB();
$db->exec("
    CREATE TABLE IF NOT EXISTS user_jingles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        jingle_name VARCHAR(255) NOT NULL,
        cloudinary_url VARCHAR(512),
        cloudinary_public_id VARCHAR(255),
        jingle_data LONGTEXT,
        storage_type VARCHAR(20) DEFAULT 'cloudinary',
        duration_seconds FLOAT DEFAULT 0,
        file_size_bytes BIGINT DEFAULT 0,
        play_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        schedule_type ENUM('interval', 'songs', 'time') DEFAULT 'interval',
        interval_minutes INT DEFAULT 7,
        after_songs_count INT DEFAULT 3,
        time_start VARCHAR(5),
        time_end VARCHAR(5),
        volume_boost_db FLOAT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Self-heal: add volume_boost_db column if missing (for existing tables)
try {
    $db->exec("ALTER TABLE user_jingles ADD COLUMN IF NOT EXISTS volume_boost_db FLOAT DEFAULT 0");
} catch (Exception $e) { /* ignore */ }

// Helper to generate UUID v4
function uuid()
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

// Helper to check if user owns jingle
// Helper to check if user owns jingle OR is admin
function checkJingleOwnership($db, $jingleId, $userId)
{
    // Check if admin
    $stmt = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if ($user && ($user['is_admin'] || $user['email'] === 'darkospira@gmail.com' || $user['email'] === 'info@infinityplay.rs')) {
        return true;
    }

    $stmt = $db->prepare("SELECT user_id FROM user_jingles WHERE id = ?");
    $stmt->execute([$jingleId]);
    $jingle = $stmt->fetch();
    return $jingle && $jingle['user_id'] === $userId;
}

// GET: List all jingles for user
if ($method === 'GET') {
    // Optional: filter by user_id if admin
    $targetUserId = $_GET['user_id'] ?? $userId;

    // Check permission if requesting other user's jingles
    if ($targetUserId !== $userId) {
        $db = getDB();
        $stmt = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
        $stmt->execute([$userId]);
        $admin = $stmt->fetch();

        if ((!$admin || !$admin['is_admin']) && $admin['email'] !== 'darkospira@gmail.com' && $admin['email'] !== 'info@infinityplay.rs') {
            sendJSON(['error' => 'Forbidden'], 403);
        }
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT * FROM user_jingles 
        WHERE user_id = ? 
        ORDER BY play_order ASC, created_at DESC
    ");
    $stmt->execute([$targetUserId]);
    $jingles = $stmt->fetchAll();

    sendJSON(['jingles' => $jingles]);
}

// POST: Create new jingle
if ($method === 'POST') {
    $data = getRequestBody();

    // Validate required fields (either cloudinary_url OR jingle_data)
    if (!isset($data['jingle_name']) || (!isset($data['cloudinary_url']) && !isset($data['jingle_data']))) {
        sendJSON(['error' => 'Missing required fields'], 400);
    }

    $db = getDB();

    // Determine target user (Admin can create for others)
    $targetUserId = $userId;
    if (isset($data['user_id']) && $data['user_id'] !== $userId) {
        // Check if current user is admin
        $stmt = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
        $stmt->execute([$userId]);
        $admin = $stmt->fetch();

        if ($admin && ($admin['is_admin'] || $admin['email'] === 'darkospira@gmail.com' || $admin['email'] === 'info@infinityplay.rs')) {
            $targetUserId = $data['user_id'];
        } else {
            sendJSON(['error' => 'Forbidden: Cannot create jingle for another user'], 403);
        }
    }

    // Check limit (5 jingles per user)
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM user_jingles WHERE user_id = ?");
    $stmt->execute([$targetUserId]);
    $count = $stmt->fetch()['count'];

    if ($count >= 5) {
        sendJSON(['error' => 'Maximum limit of 5 jingles reached'], 400);
    }

    $id = uuid();

    try {
        $stmt = $db->prepare("
            INSERT INTO user_jingles (
                id, user_id, jingle_name, cloudinary_url, cloudinary_public_id,
                jingle_data, storage_type,
                duration_seconds, file_size_bytes, play_order, is_active,
                schedule_type, interval_minutes, after_songs_count, time_start, time_end,
                volume_boost_db
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        ");

        $stmt->execute([
            $id,
            $targetUserId,
            $data['jingle_name'],
            $data['cloudinary_url'] ?? null,
            $data['cloudinary_public_id'] ?? null,
            $data['jingle_data'] ?? null,
            $data['storage_type'] ?? 'cloudinary',
            $data['duration_seconds'] ?? 0,
            $data['file_size_bytes'] ?? 0,
            $count,
            $data['is_active'] ?? true,
            $data['schedule_type'] ?? 'interval',
            $data['interval_minutes'] ?? 15,
            $data['after_songs_count'] ?? 5,
            $data['time_start'] ?? null,
            $data['time_end'] ?? null,
            $data['volume_boost_db'] ?? 0
        ]);

        sendJSON(['id' => $id, 'message' => 'Jingle created successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// PUT: Update jingle
if ($method === 'PUT') {
    $jingleId = $_GET['id'] ?? null;
    if (!$jingleId) {
        sendJSON(['error' => 'Jingle ID required'], 400);
    }

    $db = getDB();
    if (!checkJingleOwnership($db, $jingleId, $userId)) {
        sendJSON(['error' => 'Forbidden or not found'], 403);
    }

    $data = getRequestBody();
    $updates = [];
    $values = [];

    $allowedFields = [
        'jingle_name',
        'play_order',
        'is_active',
        'schedule_type',
        'interval_minutes',
        'after_songs_count',
        'time_start',
        'time_end',
        'volume_boost_db'
    ];

    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $values[] = $data[$field];
        }
    }

    if (empty($updates)) {
        sendJSON(['error' => 'No fields to update'], 400);
    }

    $values[] = $jingleId;

    try {
        $sql = "UPDATE user_jingles SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        sendJSON(['message' => 'Jingle updated successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// DELETE: Remove jingle
if ($method === 'DELETE') {
    $jingleId = $_GET['id'] ?? null;
    if (!$jingleId) {
        sendJSON(['error' => 'Jingle ID required'], 400);
    }

    $db = getDB();
    if (!checkJingleOwnership($db, $jingleId, $userId)) {
        sendJSON(['error' => 'Forbidden or not found'], 403);
    }

    try {
        $stmt = $db->prepare("DELETE FROM user_jingles WHERE id = ?");
        $stmt->execute([$jingleId]);

        sendJSON(['message' => 'Jingle deleted successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

sendJSON(['error' => 'Method not allowed'], 405);
?>