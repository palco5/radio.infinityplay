<?php
require_once 'config.php';
setCORSHeaders();

$user = requireAuth();

$query = trim($_GET['q'] ?? '');
$page  = max(0, (int)($_GET['page'] ?? 0));

if (!$query) sendJSON(['error' => 'Query required'], 400);

$url = 'https://api.deezer.com/search?' . http_build_query([
    'q'      => $query,
    'limit'  => 50,
    'index'  => $page * 50,
    'output' => 'json',
]);

$ctx = stream_context_create([
    'http' => [
        'timeout'       => 6,
        'ignore_errors' => true,
        'header'        => "User-Agent: Mozilla/5.0\r\n",
    ],
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
]);

$body = @file_get_contents($url, false, $ctx);
if ($body === false) {
    sendJSON(['error' => 'Failed to reach Deezer'], 502);
}

$data = json_decode($body, true);
if (!$data) sendJSON(['error' => 'Invalid response'], 502);

sendJSON($data);
?>
