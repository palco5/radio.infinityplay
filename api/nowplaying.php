<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

$mount     = $_GET['mount'] ?? '';
$streamUrl = $_GET['url']   ?? '';

$title    = '';
$coverart = null;
$source   = 'icy';
$extra    = [];

if ($streamUrl) {
    // Direct stream URL mode (any Icecast/Shoutcast stream)
    if (!preg_match('#^https?://#', $streamUrl) || strlen($streamUrl) > 512) {
        echo json_encode(['error' => 'Invalid URL', 'title' => '', 'coverart' => null]);
        exit;
    }
    $extra['url'] = $streamUrl;

    // If it's one of our own MediaCP-hosted streams, try the richer JSON API first.
    $identifier = extractMediaCPIdentifier($streamUrl);
    $mediaCP = $identifier ? getMediaCPNowPlaying($identifier) : null;

    if ($mediaCP) {
        $title    = $mediaCP['title'];
        $coverart = $mediaCP['coverart'];
        $source   = 'mediacp';
    } else {
        $title = getIcyTitle($streamUrl);
    }
} else {
    if (!preg_match('/^[a-zA-Z0-9\-]+$/', $mount) || strlen($mount) > 64) {
        echo json_encode(['error' => 'Invalid mount', 'title' => '', 'coverart' => null]);
        exit;
    }
    $extra['mount'] = $mount;

    $mediaCP = getMediaCPNowPlaying($mount);

    if ($mediaCP) {
        $title    = $mediaCP['title'];
        $coverart = $mediaCP['coverart'];
        $source   = 'mediacp';
    } else {
        $title = getIcyTitle('https://media.infinityplay.rs/stream/' . $mount);
    }
}

// Regardless of where the raw title came from, look it up on iTunes for a
// clean "Artist - Title" and reliable high-res cover art — raw stream titles
// are often mangled ("(Official Lyrics Video 2025) (128kbit_AAC)" etc).
$cleanedTitle = $title ? cleanRawTitle($title) : '';
$itunes = $cleanedTitle ? lookupItunes($cleanedTitle) : null;

if ($itunes) {
    $title    = $itunes['title'];
    $coverart = $itunes['coverart'];
    $source   = 'itunes';
} elseif ($cleanedTitle) {
    // No iTunes match (common for local/regional folk tracks) — still show
    // the cleaned text instead of the raw junk-laden stream title.
    $title = $cleanedTitle;
}

echo json_encode(array_merge([
    'title'     => $title,
    'coverart'  => $coverart,
    'source'    => $source,
    'timestamp' => time(),
], $extra));

// Pull the mount/station name out of a MediaCP-hosted stream URL, e.g.
// https://media.infinityplay.rs/stream/ZlatnaKruna -> ZlatnaKruna
function extractMediaCPIdentifier($url)
{
    $host = parse_url($url, PHP_URL_HOST);
    if (!$host || stripos($host, 'infinityplay.rs') === false) {
        return null;
    }
    $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
    if ($path === '') {
        return null;
    }
    $segments = explode('/', $path);
    return end($segments) ?: null;
}

// Query MediaCP's public "now playing" JSON endpoint for a station.
// Accepts the MediaCP numeric id, slug, or unique_id as $identifier.
// Returns ['title' => ..., 'coverart' => ...] or null if unavailable.
function getMediaCPNowPlaying($identifier)
{
    if (!defined('MEDIACP_API_URL') || !MEDIACP_API_URL) {
        return null;
    }

    $host = parse_url(MEDIACP_API_URL, PHP_URL_HOST);
    if (!$host) {
        return null;
    }

    $endpoint = 'https://' . $host . ':2020/json/stream/' . rawurlencode($identifier);

    $context = stream_context_create([
        'http' => ['timeout' => 4, 'ignore_errors' => true],
        'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);

    $response = @file_get_contents($endpoint, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || empty($data['status']) || empty($data['nowplaying'])) {
        return null;
    }

    return [
        'title'    => $data['nowplaying'],
        'coverart' => $data['coverart'] ?? null,
    ];
}

// Strip common junk trailing tags from ripped/rebroadcast stream titles, e.g.
// "Artist - Song (Official Lyrics Video 2025) (128kbit_AAC)" -> "Artist - Song".
// Only strips a trailing (...)/[...] group if its contents look like junk —
// legitimate tags like "(Remix)" or "(feat. X)" are left alone.
function cleanRawTitle($raw)
{
    $junkWords = '/\d+\s*k(bit|bps)|\b(official|video|audio|lyrics?|visualizer|hd|hq|mv|aac|mp3|stream)\b/i';
    $title = trim($raw);

    while (preg_match('/^(.*?)[\(\[]([^\)\]]*)[\)\]]\s*$/', $title, $m)) {
        $bracketContent = str_replace('_', ' ', $m[2]);
        if (preg_match($junkWords, $bracketContent)) {
            $title = trim($m[1]);
        } else {
            break;
        }
    }

    return trim($title, " -\t\n\r\0\x0B");
}

// Look up a cleaned "Artist - Title" string on the iTunes Search API to get
// canonical naming + reliable cover art. Returns null if no (trustworthy) match.
//
// Tries the Serbian storefront first — a lot of what plays on these stations
// is regional folk/pop that the default US catalog doesn't carry — then
// falls back to the default (US/international) catalog. If both come back
// empty, retries once more with short 1-2 letter glue words (conjunctions
// like "i"/"u"/"a") stripped out, since they occasionally throw off iTunes'
// ranking for otherwise-exact regional titles.
function lookupItunes($cleanedTitle)
{
    $cleanedTitle = trim($cleanedTitle);
    if ($cleanedTitle === '') {
        return null;
    }

    $result = itunesSearchOnce($cleanedTitle, 'rs') ?? itunesSearchOnce($cleanedTitle, null);
    if ($result) {
        return $result;
    }

    $stripped = preg_replace('/\b[a-zA-ZčćžšđČĆŽŠĐ]{1,2}\b/u', ' ', $cleanedTitle);
    $stripped = trim(preg_replace('/\s+/', ' ', $stripped));
    if ($stripped !== '' && $stripped !== $cleanedTitle) {
        return itunesSearchOnce($stripped, 'rs') ?? itunesSearchOnce($stripped, null);
    }

    return null;
}

// Single iTunes Search API request + result validation. Returns
// ['title' => ..., 'coverart' => ...] or null if no result / result is a
// bad match for $term (see itunesResultLooksValid).
function itunesSearchOnce($term, $country)
{
    if ($term === '') {
        return null;
    }

    $params = [
        'term'   => $term,
        'media'  => 'music',
        'entity' => 'song',
        'limit'  => 1,
    ];
    if ($country) {
        $params['country'] = $country;
    }

    $url = 'https://itunes.apple.com/search?' . http_build_query($params);

    $context = stream_context_create([
        'http' => ['timeout' => 3, 'ignore_errors' => true],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (empty($data['results'][0])) {
        return null;
    }

    $result = $data['results'][0];
    if (!itunesResultLooksValid($term, $result)) {
        return null;
    }

    $artwork = $result['artworkUrl100'] ?? null;
    if ($artwork) {
        $artwork = str_replace('100x100bb', '600x600bb', $artwork);
    }

    return [
        'title'    => $result['artistName'] . ' - ' . $result['trackName'],
        'coverart' => $artwork,
    ];
}

// iTunes' full-text search is fuzzy enough to return a completely unrelated
// track for garbage input (e.g. a DJ mix name). Guard against that by
// requiring at least half of the meaningful (3+ letter) words from our
// search term to actually appear in the candidate's artist/track name.
function itunesResultLooksValid($term, $result)
{
    $queryWords = normalizeSearchWords($term);
    if (!$queryWords) {
        return true;
    }

    $resultText = implode(' ', normalizeSearchWords($result['artistName'] . ' ' . $result['trackName']));

    $matched = 0;
    foreach ($queryWords as $word) {
        if (mb_strpos($resultText, $word) !== false) {
            $matched++;
        }
    }

    return ($matched / count($queryWords)) >= 0.5;
}

function normalizeSearchWords($s)
{
    $s = mb_strtolower($s, 'UTF-8');
    $s = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $s);
    $words = preg_split('/\s+/u', trim($s));
    return array_values(array_filter($words, fn($w) => mb_strlen($w) >= 3));
}

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

    // Skip over the audio bytes to reach the first metadata block, then read
    // the length byte and the metadata itself — all via readIcyBytes(),
    // which retries on empty reads instead of trusting feof() alone. PHP's
    // ssl:// stream wrapper can report a spurious EOF between TLS record
    // boundaries mid-stream even though more data is still coming, which
    // would otherwise cut the skip short and misalign everything that follows.
    readIcyBytes($fp, $metaint);

    $lengthByte = readIcyBytes($fp, 1);
    if ($lengthByte === '') {
        fclose($fp);
        return '';
    }
    $metaLength = ord($lengthByte) * 16;

    $title = '';
    if ($metaLength > 0) {
        $metadata = readIcyBytes($fp, $metaLength);
        // ICY metadata format: StreamTitle='Artist - Title';StreamUrl='...';
        if (preg_match("/StreamTitle='([^;]*)'/", $metadata, $m)) {
            $title = trim(rtrim($m[1], "\x00 "));
        }
    }

    fclose($fp);
    return $title;
}

// Reliably read exactly $length bytes from a (possibly SSL-wrapped) stream
// socket, retrying briefly on empty reads instead of trusting feof() alone.
function readIcyBytes($fp, $length)
{
    $data = '';
    $emptyReads = 0;
    while (strlen($data) < $length) {
        $chunk = fread($fp, $length - strlen($data));
        if ($chunk === false || $chunk === '') {
            if (feof($fp)) break;
            if (++$emptyReads > 20) break;
            usleep(10000);
            continue;
        }
        $emptyReads = 0;
        $data .= $chunk;
    }
    return $data;
}
