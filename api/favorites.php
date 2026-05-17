<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$currentUser = requireAuth();

// Get user favorites
if ($method === 'GET') {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT f.id, f.station_id, f.created_at,
               s.name, s.description, s.genre, s.logo_url, s.stream_url
        FROM favorites f
        JOIN stations s ON f.station_id = s.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    ");

    $stmt->execute([$currentUser['userId']]);
    $favorites = $stmt->fetchAll();

    sendJSON(['favorites' => $favorites]);
}

// Add favorite
if ($method === 'POST') {
    $data = getRequestBody();
    $station_id = $data['station_id'] ?? '';

    if (empty($station_id)) {
        sendJSON(['error' => 'Station ID is required'], 400);
    }

    $db = getDB();

    // Check if already exists
    $stmt = $db->prepare("SELECT id FROM favorites WHERE user_id = ? AND station_id = ?");
    $stmt->execute([$currentUser['userId'], $station_id]);

    if ($stmt->fetch()) {
        sendJSON(['message' => 'Already in favorites']);
    }

    // Add favorite
    $id = bin2hex(random_bytes(16));
    $stmt = $db->prepare("INSERT INTO favorites (id, user_id, station_id) VALUES (?, ?, ?)");
    $stmt->execute([$id, $currentUser['userId'], $station_id]);

    sendJSON(['favorite' => ['id' => $id, 'station_id' => $station_id]], 201);
}

// Remove favorite
if ($method === 'DELETE') {
    $station_id = $_GET['station_id'] ?? '';

    if (empty($station_id)) {
        sendJSON(['error' => 'Station ID is required'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM favorites WHERE user_id = ? AND station_id = ?");
    $stmt->execute([$currentUser['userId'], $station_id]);

    sendJSON(['message' => 'Favorite removed']);
}

sendJSON(['error' => 'Method not allowed'], 405);
?>