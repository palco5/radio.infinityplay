<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

$mount     = $_GET['mount'] ?? '';
$streamUrl = $_GET['url']   ?? '';

if ($streamUrl) {
    // Direct stream URL mode (any Icecast/Shoutcast stream)
    if (!preg_match('#^https?://#', $streamUrl) || strlen($streamUrl) > 512) {
        echo json_encode(['error' => 'Invalid URL', 'title' => '']);
        exit;
    }
    $title = getIcyTitle($streamUrl);
    echo json_encode([
        'title'     => $title,
        'url'       => $streamUrl,
        'timestamp' => time(),
    ]);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9\-]+$/', $mount) || strlen($mount) > 64) {
    echo json_encode(['error' => 'Invalid mount', 'title' => '']);
    exit;
}

$streamUrl = 'https://media.infinityplay.rs/stream/' . $mount;
$title = getIcyTitle($streamUrl);

echo json_encode([
    'title'     => $title,
    'mount'     => $mount,
    'timestamp' => time(),
]);

function getIcyTitle($url)
{
    $parsed = parse_url($url);
    $host   = $parsed['host'];
    $port   = isset($parsed['port']) ? (int)$parsed['port'] : ($parsed['scheme'] === 'https' ? 443 : 80);
    $path   = isset($parsed['path']) ? $parsed['path'] : '/';
    $isHttps = $parsed['scheme'] === 'https';

    // Use stream_socket_client so we can pass an SSL context
    $context = stream_context_create([
        'ssl' => [
            'verify_peer'      => false,
            'verify_peer_name' => false,
        ],
    ]);

    $target = ($isHttps ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $fp = @stream_socket_client($target, $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $context);

    if (!$fp) {
        return '';
    }

    stream_set_timeout($fp, 8);

    // Send HTTP/1.0 request with Icy-MetaData header
    $request  = "GET {$path} HTTP/1.0\r\n";
    $request .= "Host: {$host}\r\n";
    $request .= "Icy-MetaData: 1\r\n";
    $request .= "User-Agent: InfinityPlay-NowPlaying/1.0\r\n";
    $request .= "Connection: close\r\n\r\n";
    fwrite($fp, $request);

    // Read response headers
    $metaint    = 0;
    $statusCode = 0;

    while (!feof($fp)) {
        $line = fgets($fp, 1024);
        if ($line === false) break;
        $trimmed = trim($line);
        if ($trimmed === '') break; // blank line = end of headers

        if (preg_match('#^HTTP/[\d.]+ (\d+)#i', $trimmed, $m)) {
            $statusCode = (int)$m[1];
        }
        if (stripos($trimmed, 'icy-metaint:') !== false) {
            $metaint = (int)trim(preg_replace('/^icy-metaint:\s*/i', '', $trimmed));
        }
    }

    if ($metaint <= 0 || ($statusCode > 0 && $statusCode >= 400)) {
        fclose($fp);
        return '';
    }

    // Skip over the audio bytes to reach the first metadata block
    $remaining = $metaint;
    while ($remaining > 0 && !feof($fp)) {
        $chunk = fread($fp, min(8192, $remaining));
        if ($chunk === false || $chunk === '') break;
        $remaining -= strlen($chunk);
    }

    // Read metadata length byte (length = byte_value * 16)
    $lengthByte = fread($fp, 1);
    if (!$lengthByte || strlen($lengthByte) === 0) {
        fclose($fp);
        return '';
    }
    $metaLength = ord($lengthByte) * 16;

    $title = '';
    if ($metaLength > 0) {
        $metadata      = '';
        $metaRemaining = $metaLength;
        while ($metaRemaining > 0 && !feof($fp)) {
            $chunk = fread($fp, $metaRemaining);
            if ($chunk === false) break;
            $metadata      .= $chunk;
            $metaRemaining -= strlen($chunk);
        }
        // ICY metadata format: StreamTitle='Artist - Title';StreamUrl='...';
        if (preg_match("/StreamTitle='([^;]*)'/", $metadata, $m)) {
            $title = trim(rtrim($m[1], "\x00 "));
        }
    }

    fclose($fp);
    return $title;
}
