<?php
require_once 'config.php';
setCORSHeaders();

$db = getDB();

// Self-heal: create remote_sessions table
try {
    $db->exec("CREATE TABLE IF NOT EXISTS remote_sessions (
        device_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        device_type VARCHAR(20) DEFAULT 'desktop',
        device_name VARCHAR(100) DEFAULT 'Uređaj',
        device_number INT DEFAULT 0,
        station_id VARCHAR(36) NULL,
        station_name VARCHAR(200) NULL,
        is_playing TINYINT(1) DEFAULT 0,
        pending_command TEXT NULL,
        command_id VARCHAR(36) NULL,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (device_id),
        INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {}

// Self-heal: add columns to existing remote_sessions tables
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN device_number INT DEFAULT 0 AFTER device_name"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN song_title VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN song_artist VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN song_artwork VARCHAR(500) DEFAULT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN now_playing_title VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN now_playing_cover VARCHAR(500) DEFAULT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN now_playing_is_jingle TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN song_state VARCHAR(20) DEFAULT 'idle'"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions MODIFY COLUMN pending_command TEXT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN song_queue TEXT NULL"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN saved_playlist_count INT DEFAULT 0"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE remote_sessions ADD COLUMN volume INT DEFAULT 70"); } catch (Exception $e) {}

// Self-heal: create remote_commands queue table (replaces single pending_command field)
try {
    $db->exec("CREATE TABLE IF NOT EXISTS remote_commands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        command TEXT NOT NULL,
        command_id VARCHAR(36) NOT NULL,
        executed TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_pending (device_id, executed, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {}

$user = requireAuth();
$userId = $user['userId'];
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true) ?? [];

// Clean up stale sessions (not seen in 90 seconds)
try {
    $db->exec("DELETE FROM remote_sessions WHERE last_seen < DATE_SUB(NOW(), INTERVAL 90 SECOND)");
} catch (Exception $e) {}

// Clean up old executed commands and stale unexecuted commands
try {
    $db->exec("DELETE FROM remote_commands WHERE executed = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
    $db->exec("DELETE FROM remote_commands WHERE executed = 0 AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)");
} catch (Exception $e) {}

// GET status — get all devices for this user + my pending command from queue
if ($method === 'GET' && $action === 'status') {
    $deviceId = $_GET['device_id'] ?? '';

    $stmt = $db->prepare("SELECT device_id, device_type, device_name, device_number, station_id, station_name, is_playing, song_title, song_artist, song_artwork, now_playing_title, now_playing_cover, now_playing_is_jingle, song_state, song_queue, saved_playlist_count, volume, last_seen FROM remote_sessions WHERE user_id = ? ORDER BY device_number ASC, last_seen DESC");
    $stmt->execute([$userId]);
    $sessions = $stmt->fetchAll();

    $myCommand = null;
    $myCommandId = null;
    if ($deviceId) {
        $cmdStmt = $db->prepare("SELECT command, command_id FROM remote_commands WHERE device_id = ? AND user_id = ? AND executed = 0 ORDER BY id ASC LIMIT 1");
        $cmdStmt->execute([$deviceId, $userId]);
        $cmdRow = $cmdStmt->fetch();
        if ($cmdRow) {
            $myCommand = $cmdRow['command'];
            $myCommandId = $cmdRow['command_id'];
        }
    }

    sendJSON([
        'sessions' => $sessions,
        'my_command' => $myCommand,
        'my_command_id' => $myCommandId,
    ]);
}

// POST heartbeat — register/update my device state, return oldest pending command
if ($method === 'POST' && $action === 'heartbeat') {
    $deviceId = $data['device_id'] ?? '';
    $deviceType = $data['device_type'] ?? 'desktop';
    $deviceName = $data['device_name'] ?? 'Uređaj';
    $stationId = $data['station_id'] ?? null;
    $stationName = $data['station_name'] ?? null;
    $isPlaying = isset($data['is_playing']) ? (int)$data['is_playing'] : 0;
    $songTitle = $data['song_title'] ?? null;
    $songArtist = $data['song_artist'] ?? null;
    $songArtwork = $data['song_artwork'] ?? null;
    $nowPlayingTitle = $data['now_playing_title'] ?? null;
    $nowPlayingCover = $data['now_playing_cover'] ?? null;
    $nowPlayingIsJingle = isset($data['now_playing_is_jingle']) ? (int)(bool)$data['now_playing_is_jingle'] : 0;
    $songState = $data['song_state'] ?? 'idle';
    $songQueue = $data['song_queue'] ?? null;
    $savedPlaylistCount = isset($data['saved_playlist_count']) ? (int)$data['saved_playlist_count'] : 0;
    $volume = isset($data['volume']) ? max(0, min(100, (int)$data['volume'])) : 70;

    if (!$deviceId) sendJSON(['error' => 'device_id required'], 400);

    // Determine device_number: keep existing (if > 0) or assign new sequential number
    $checkStmt = $db->prepare("SELECT device_number FROM remote_sessions WHERE device_id = ?");
    $checkStmt->execute([$deviceId]);
    $existingRow = $checkStmt->fetch();
    if ($existingRow !== false && (int)$existingRow['device_number'] > 0) {
        $deviceNumber = (int)$existingRow['device_number'];
    } else {
        $maxStmt = $db->prepare("SELECT COALESCE(MAX(device_number), 0) as max_num FROM remote_sessions WHERE user_id = ? AND device_id != ?");
        $maxStmt->execute([$userId, $deviceId]);
        $maxRow = $maxStmt->fetch();
        $deviceNumber = (int)$maxRow['max_num'] + 1;
    }

    $stmt = $db->prepare("
        INSERT INTO remote_sessions (device_id, user_id, device_type, device_name, device_number, station_id, station_name, is_playing, song_title, song_artist, song_artwork, now_playing_title, now_playing_cover, now_playing_is_jingle, song_state, song_queue, saved_playlist_count, volume, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            device_type = VALUES(device_type),
            device_name = VALUES(device_name),
            station_id = VALUES(station_id),
            station_name = VALUES(station_name),
            is_playing = VALUES(is_playing),
            song_title = VALUES(song_title),
            song_artist = VALUES(song_artist),
            song_artwork = VALUES(song_artwork),
            now_playing_title = VALUES(now_playing_title),
            now_playing_cover = VALUES(now_playing_cover),
            now_playing_is_jingle = VALUES(now_playing_is_jingle),
            song_state = VALUES(song_state),
            song_queue = VALUES(song_queue),
            saved_playlist_count = VALUES(saved_playlist_count),
            volume = VALUES(volume),
            last_seen = NOW(),
            device_number = IF(device_number = 0, VALUES(device_number), device_number)
    ");
    $stmt->execute([$deviceId, $userId, $deviceType, $deviceName, $deviceNumber, $stationId, $stationName, $isPlaying, $songTitle, $songArtist, $songArtwork, $nowPlayingTitle, $nowPlayingCover, $nowPlayingIsJingle, $songState, $songQueue, $savedPlaylistCount, $volume]);

    // Return device info + oldest pending command from queue
    $rowStmt = $db->prepare("SELECT device_number, device_name FROM remote_sessions WHERE device_id = ?");
    $rowStmt->execute([$deviceId]);
    $row = $rowStmt->fetch();

    $cmdStmt = $db->prepare("SELECT command, command_id FROM remote_commands WHERE device_id = ? AND user_id = ? AND executed = 0 ORDER BY id ASC LIMIT 1");
    $cmdStmt->execute([$deviceId, $userId]);
    $cmdRow = $cmdStmt->fetch();

    sendJSON([
        'ok' => true,
        'pending_command' => $cmdRow ? $cmdRow['command'] : null,
        'command_id' => $cmdRow ? $cmdRow['command_id'] : null,
        'device_number' => (int)($row['device_number'] ?? 0),
        'server_name' => $row['device_name'] ?? null,
    ]);
}

// POST command — enqueue command for a target device
if ($method === 'POST' && $action === 'command') {
    $targetDeviceId = $data['target_device_id'] ?? '';
    $command = $data['command'] ?? '';
    $commandId = generateUUID();

    if (!$targetDeviceId || !$command) sendJSON(['error' => 'target_device_id and command required'], 400);

    // Verify target belongs to same user
    $stmt = $db->prepare("SELECT device_id FROM remote_sessions WHERE device_id = ? AND user_id = ?");
    $stmt->execute([$targetDeviceId, $userId]);
    if (!$stmt->fetch()) sendJSON(['error' => 'Target device not found'], 404);

    // Volume commands: only the latest value matters — replace any queued ones
    // so dragging the slider doesn't pile up a backlog the device replays late.
    if (strpos($command, 'volume:') === 0) {
        $del = $db->prepare("DELETE FROM remote_commands WHERE device_id = ? AND user_id = ? AND executed = 0 AND command LIKE 'volume:%'");
        $del->execute([$targetDeviceId, $userId]);
    }

    // Insert into command queue (no more overwriting!)
    $stmt = $db->prepare("INSERT INTO remote_commands (device_id, user_id, command, command_id) VALUES (?, ?, ?, ?)");
    $stmt->execute([$targetDeviceId, $userId, $command, $commandId]);

    sendJSON(['ok' => true, 'command_id' => $commandId]);
}

// POST ack — device confirms it executed the command
if ($method === 'POST' && $action === 'ack') {
    $deviceId = $data['device_id'] ?? '';
    $commandId = $data['command_id'] ?? '';

    if (!$deviceId || !$commandId) sendJSON(['error' => 'device_id and command_id required'], 400);

    $stmt = $db->prepare("UPDATE remote_commands SET executed = 1 WHERE command_id = ? AND device_id = ? AND user_id = ?");
    $stmt->execute([$commandId, $deviceId, $userId]);

    sendJSON(['ok' => true]);
}

// POST rename — directly update device name in DB
if ($method === 'POST' && $action === 'rename') {
    $targetDeviceId = $data['device_id'] ?? '';
    $newName = trim($data['device_name'] ?? '');

    if (!$targetDeviceId || !$newName) sendJSON(['error' => 'device_id and device_name required'], 400);

    $stmt = $db->prepare("UPDATE remote_sessions SET device_name = ? WHERE device_id = ? AND user_id = ?");
    $stmt->execute([$newName, $targetDeviceId, $userId]);

    sendJSON(['ok' => true]);
}

// GET live_users — admin: which station each user is listening to
if ($method === 'GET' && $action === 'live_users') {
    $stmt = $db->prepare("SELECT is_admin FROM profiles WHERE id = ?");
    $stmt->execute([$userId]);
    $adminRow = $stmt->fetch();
    $isAdmin = ($adminRow && $adminRow['is_admin']) ||
               in_array($user['email'], ['darkospira@gmail.com', 'info@infinityplay.rs']);

    if (!$isAdmin) sendJSON(['error' => 'Forbidden'], 403);

    $stmt = $db->prepare("
        SELECT user_id, station_name, station_id, is_playing, device_name, device_type
        FROM remote_sessions
        WHERE station_id IS NOT NULL
        ORDER BY is_playing DESC, last_seen DESC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Group by user_id — keep the most active session per user
    $userMap = [];
    foreach ($rows as $row) {
        $uid = $row['user_id'];
        if (!isset($userMap[$uid]) || (!$userMap[$uid]['is_playing'] && $row['is_playing'])) {
            $userMap[$uid] = [
                'station_name' => $row['station_name'],
                'station_id'   => $row['station_id'],
                'is_playing'   => (bool)$row['is_playing'],
                'device_name'  => $row['device_name'],
                'device_type'  => $row['device_type'],
            ];
        }
    }

    sendJSON(['user_sessions' => $userMap]);
}

// GET live_stats — admin: real-time listener counts per station
if ($method === 'GET' && $action === 'live_stats') {
    $stmt = $db->prepare("SELECT is_admin FROM profiles WHERE id = ?");
    $stmt->execute([$userId]);
    $adminRow = $stmt->fetch();
    $isAdmin = ($adminRow && $adminRow['is_admin']) ||
               in_array($user['email'], ['darkospira@gmail.com', 'info@infinityplay.rs']);

    if (!$isAdmin) sendJSON(['error' => 'Forbidden'], 403);

    $stmt = $db->prepare("
        SELECT station_id, COUNT(*) as cnt
        FROM remote_sessions
        WHERE is_playing = 1 AND station_id IS NOT NULL
        GROUP BY station_id
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $listenerMap = [];
    foreach ($rows as $row) {
        $listenerMap[$row['station_id']] = (int)$row['cnt'];
    }

    $totalStmt = $db->prepare("SELECT COUNT(*) as total FROM remote_sessions WHERE is_playing = 1");
    $totalStmt->execute();
    $totalRow = $totalStmt->fetch();

    $devicesStmt = $db->prepare("SELECT COUNT(*) as total FROM remote_sessions");
    $devicesStmt->execute();
    $devicesRow = $devicesStmt->fetch();

    sendJSON([
        'listener_counts' => $listenerMap,
        'total_playing'   => (int)($totalRow['total'] ?? 0),
        'total_devices'   => (int)($devicesRow['total'] ?? 0),
    ]);
}

// DELETE — unregister device on logout/close
if ($method === 'DELETE') {
    $deviceId = $_GET['device_id'] ?? '';
    if ($deviceId) {
        $stmt = $db->prepare("DELETE FROM remote_sessions WHERE device_id = ? AND user_id = ?");
        $stmt->execute([$deviceId, $userId]);
        // Also clear its pending commands
        $stmt2 = $db->prepare("DELETE FROM remote_commands WHERE device_id = ? AND user_id = ?");
        $stmt2->execute([$deviceId, $userId]);
    }
    sendJSON(['ok' => true]);
}

sendJSON(['error' => 'Invalid action'], 400);
?>
