<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Get all stations
if ($method === 'GET') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $db->prepare("
            SELECT * FROM stations WHERE id = ?
        ");
        $stmt->execute([$id]);
        $station = $stmt->fetch();

        if ($station) {
            if ($station['recommended_for']) {
                $station['recommended_for'] = json_decode($station['recommended_for']);
            }
            sendJSON(['station' => $station]);
        } else {
            sendJSON(['error' => 'Station not found'], 404);
        }
    } else {
        $stmt = $db->query("
            SELECT id, name, description, genre, logo_url, stream_url, bitrate,
                   is_featured, listener_count, icon_url, icon_emoji, background_url,
                   background_color, background_type, grid_row, grid_column, grid_page,
                   recommended_for, created_at, is_active
            FROM stations
            ORDER BY grid_page, grid_row, grid_column
        ");

        $stations = $stmt->fetchAll();

        // Decode JSON fields
        foreach ($stations as &$station) {
            if ($station['recommended_for']) {
                $station['recommended_for'] = json_decode($station['recommended_for']);
            }
        }

        sendJSON(['stations' => $stations]);
    }
}

// Create new station
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['name']) || !isset($data['stream_url'])) {
        sendJSON(['error' => 'Name and Stream URL are required'], 400);
    }

    $id = generateUUID();
    $name = $data['name'];
    $description = $data['description'] ?? '';
    $genre = $data['genre'] ?? 'Other';
    $logo_url = $data['logo_url'] ?? '';
    $stream_url = $data['stream_url'];
    $bitrate = $data['bitrate'] ?? 128;
    $is_featured = isset($data['is_featured']) ? (int) $data['is_featured'] : 0;
    $icon_url = $data['icon_url'] ?? '';
    $icon_emoji = $data['icon_emoji'] ?? '🎵';
    $background_url = $data['background_url'] ?? '';
    $background_color = $data['background_color'] ?? '#000000';
    $background_type = $data['background_type'] ?? 'color';
    $grid_row = $data['grid_row'] ?? 1;
    $grid_column = $data['grid_column'] ?? 1;
    $grid_page = $data['grid_page'] ?? 1;
    $recommended_for = isset($data['recommended_for']) ? json_encode($data['recommended_for']) : null;
    $is_active = isset($data['is_active']) ? (int) $data['is_active'] : 1;

    $stmt = $db->prepare("
        INSERT INTO stations (
            id, name, description, genre, logo_url, stream_url, bitrate,
            is_featured, icon_url, icon_emoji, background_url,
            background_color, background_type, grid_row, grid_column, grid_page,
            recommended_for, is_active, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, NOW()
        )
    ");

    try {
        $stmt->execute([
            $id,
            $name,
            $description,
            $genre,
            $logo_url,
            $stream_url,
            $bitrate,
            $is_featured,
            $icon_url,
            $icon_emoji,
            $background_url,
            $background_color,
            $background_type,
            $grid_row,
            $grid_column,
            $grid_page,
            $recommended_for,
            $is_active
        ]);

        sendJSON(['success' => true, 'id' => $id, 'message' => 'Station created successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// Update station
if ($method === 'PUT') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$id) {
        sendJSON(['error' => 'Station ID is required'], 400);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Build update query dynamically
    $fields = [];
    $values = [];

    $allowedFields = [
        'name',
        'description',
        'genre',
        'logo_url',
        'stream_url',
        'bitrate',
        'is_featured',
        'icon_url',
        'icon_emoji',
        'background_url',
        'background_color',
        'background_type',
        'grid_row',
        'grid_column',
        'grid_page',
        'recommended_for',
        'is_active'
    ];

    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            if ($field === 'recommended_for') {
                $values[] = json_encode($data[$field]);
            } elseif ($field === 'is_featured' || $field === 'is_active') {
                $values[] = (int) $data[$field];
            } else {
                $values[] = $data[$field];
            }
        }
    }

    if (empty($fields)) {
        sendJSON(['error' => 'No fields to update'], 400);
    }

    $values[] = $id;
    $sql = "UPDATE stations SET " . implode(', ', $fields) . " WHERE id = ?";

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        sendJSON(['success' => true, 'message' => 'Station updated successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// Delete station
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$id) {
        sendJSON(['error' => 'Station ID is required'], 400);
    }

    try {
        $stmt = $db->prepare("DELETE FROM stations WHERE id = ?");
        $stmt->execute([$id]);
        sendJSON(['success' => true, 'message' => 'Station deleted successfully']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

sendJSON(['error' => 'Method not allowed'], 405);
?>