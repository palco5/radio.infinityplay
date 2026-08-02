<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

$mount     = $_GET['mount'] ?? '';
$streamUrl = $_GET['url']   ?? '';

$title      = '';
$coverart   = null;
$source     = 'icy';
$extra      = [];
$identifier = null; // MediaCP stream identifier (slug/unique_id), if this is one of ours

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
    $identifier = $mount;

    $mediaCP = getMediaCPNowPlaying($mount);

    if ($mediaCP) {
        $title    = $mediaCP['title'];
        $coverart = $mediaCP['coverart'];
        $source   = 'mediacp';
    } else {
        $title = getIcyTitle('https://media.infinityplay.rs/stream/' . $mount);
    }
}

$cleanedTitle = $title ? cleanRawTitle($title) : '';

// Jingle check first (only for our MediaCP-hosted streams): a jingle is a
// track that lives in the station's MediaCP "jingle" playlist. We must NOT run
// it through iTunes — jingles ("RADIO VACE" etc.) have no catalog entry, so
// iTunes mis-matches them to a random song + wrong cover. Instead show the real
// MediaCP name and let the frontend draw a mic icon (is_jingle: true).
$isJingle = false;
if ($cleanedTitle && $identifier) {
    $isJingle = isJingleTitle($identifier, $cleanedTitle);
}

if ($isJingle) {
    $title    = $cleanedTitle; // exactly as named in MediaCP (junk tags stripped)
    $coverart = null;          // frontend renders a jingle/mic icon
    $source   = 'jingle';
} else {
    // Regular track: look it up on iTunes for a clean "Artist - Title" and
    // reliable high-res cover art — raw stream titles are often mangled
    // ("(Official Lyrics Video 2025) (128kbit_AAC)" etc).
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
}

echo json_encode(array_merge([
    'title'     => $title,
    'coverart'  => $coverart,
    'source'    => $source,
    'is_jingle' => $isJingle,
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
    // Use the http(s):// stream wrapper (fopen), not a raw stream_socket_client
    // connection — some hosts (this one included) block outbound raw sockets
    // to non-standard ports at the OS/security-module level while still
    // allowing normal HTTP(S) requests through the standard wrapper.
    $context = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'header'  => "Icy-MetaData: 1\r\nUser-Agent: InfinityPlay-NowPlaying/1.0\r\n",
            'timeout' => 8,
        ],
        'ssl' => [
            'verify_peer'      => false,
            'verify_peer_name' => false,
        ],
    ]);

    $fp = @fopen($url, 'r', false, $context);
    if (!$fp) {
        return '';
    }

    stream_set_timeout($fp, 8);

    $metaint    = 0;
    $statusCode = 0;
    $meta = stream_get_meta_data($fp);
    foreach ($meta['wrapper_data'] ?? [] as $h) {
        if (preg_match('#^HTTP/[\d.]+ (\d+)#i', $h, $m)) {
            $statusCode = (int)$m[1];
        }
        if (stripos($h, 'icy-metaint:') !== false) {
            $metaint = (int)trim(preg_replace('/^icy-metaint:\s*/i', '', $h));
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
// socket, retrying on empty reads instead of trusting feof() alone. PHP's
// ssl:// wrapper routinely returns an empty string from fread() with
// feof() still false — either a TLS record boundary that produced no new
// application bytes on this call, or a live Icecast source that only
// bursts audio every second or so — so this needs real patience (bounded
// by a wall-clock deadline, not a fixed retry count) rather than a couple
// of quick retries.
function readIcyBytes($fp, $length, $timeoutSeconds = 8)
{
    $data = '';
    $deadline = microtime(true) + $timeoutSeconds;
    while (strlen($data) < $length) {
        $chunk = fread($fp, $length - strlen($data));
        if ($chunk === false || $chunk === '') {
            if (feof($fp)) break;
            if (microtime(true) > $deadline) break;
            usleep(5000);
            continue;
        }
        $data .= $chunk;
    }
    return $data;
}

// ─────────────────────────────────────────────────────────────
// Jingle detection for our MediaCP-hosted streams.
//
// A "jingle" is any track that sits in the station's MediaCP jingle playlist
// (Dashboard → AutoDJ → Jingles). The AutoDJ inserts it into the live stream
// every few songs, and its ICY title is just the file's tag (e.g. "RADIO VACE")
// — which iTunes then wrongly matches to some unrelated song + cover. So we
// fetch the jingle track titles from the MediaCP REST API (reachable on 443
// from Loopia) and, when the now-playing title matches one, flag it as a jingle
// instead of running the iTunes lookup.
//
// The REST calls are cached to a temp file (1h) so the frequently-polled
// now-playing endpoint stays fast. Everything here is best-effort: on any
// failure we return "not a jingle" and normal now-playing continues.
// ─────────────────────────────────────────────────────────────

// GET a MediaCP REST endpoint on 443 (NOT :2020, which Loopia can't reach).
function mcpApiGet($path)
{
    if (!defined('MEDIACP_API_URL') || !MEDIACP_API_URL || !defined('MEDIACP_API_KEY') || !MEDIACP_API_KEY) {
        return null;
    }
    $host = parse_url(MEDIACP_API_URL, PHP_URL_HOST);
    if (!$host) {
        return null;
    }
    $context = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'header'        => "Authorization: Bearer " . MEDIACP_API_KEY . "\r\nAccept: application/json\r\n",
            'timeout'       => 12,
            'ignore_errors' => true,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    // The Loopia→MediaCP hop is flaky, so retry once on a failed/empty read.
    $url = 'https://' . $host . $path;
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $response = @file_get_contents($url, false, $context);
        if ($response !== false && $response !== '') {
            $decoded = json_decode($response, true);
            if ($decoded !== null) {
                return $decoded;
            }
        }
    }
    return null;
}

// Resolve + cache the MediaCP service id for an identifier (24h). Only a
// SUCCESSFUL resolve is cached, so a flaky Loopia→MediaCP request never
// poisons it — and once cached, the expensive service-list paging is skipped.
function mcpServiceIdCached($identifier)
{
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string) $identifier);
    $cf   = sys_get_temp_dir() . '/ip_svcid_' . $safe . '.json';
    if (is_file($cf)) {
        $c = json_decode((string) @file_get_contents($cf), true);
        if (is_array($c) && !empty($c['id']) && (time() - (int) ($c['t'] ?? 0) < 86400)) {
            return (int) $c['id'];
        }
    }
    $id = mcpResolveServiceId($identifier);
    if ($id) {
        @file_put_contents($cf, json_encode(['t' => time(), 'id' => $id]));
    }
    return $id;
}

// Resolve a stream identifier (slug / unique_id / numeric id) to the MediaCP
// media-service id needed for per-service API calls.
function mcpResolveServiceId($identifier)
{
    if ($identifier === null || $identifier === '') {
        return null;
    }
    $needle = mb_strtolower((string) $identifier, 'UTF-8');
    for ($page = 1; $page <= 25; $page++) {
        $data = mcpApiGet("/api/0/media-service/list?page={$page}");
        if (!is_array($data)) {
            return null;
        }
        $items = isset($data['data']) && is_array($data['data']) ? $data['data'] : $data;
        if (!is_array($items) || count($items) === 0) {
            break;
        }
        foreach ($items as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            foreach (['id', 'slug', 'unique_id', 'mountpoints'] as $field) {
                if (isset($svc[$field]) && mb_strtolower((string) $svc[$field], 'UTF-8') === $needle) {
                    return isset($svc['id']) ? (int) $svc['id'] : null;
                }
            }
        }
        $lastPage = $data['last_page'] ?? $page;
        if ($page >= (int) $lastPage) {
            break;
        }
    }
    return null;
}

// Normalise a title for comparison: strip junk tags, lowercase, collapse space.
function jingleTitleNorm($s)
{
    $s = cleanRawTitle((string) $s);
    $s = mb_strtolower(trim($s), 'UTF-8');
    return preg_replace('/\s+/', ' ', $s);
}

// The set (map normTitle => true) of jingle titles for a station, cached 1h.
// Keys include the bare title, "title - artist", "artist - title", and the
// filename (minus extension) so we match whatever order the ICY tag uses.
function getJingleTitles($identifier)
{
    $safe      = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string) $identifier);
    $cacheFile = sys_get_temp_dir() . '/ip_jingles_' . $safe . '.json';
    if (is_file($cacheFile)) {
        $cached = json_decode((string) @file_get_contents($cacheFile), true);
        // New format: { t: <unixtime>, titles: {...} }. A populated result is
        // cached for 1h; an EMPTY result only 5min, so a transient REST failure
        // (which would otherwise poison detection for a full hour) self-heals.
        if (is_array($cached) && isset($cached['t']) && isset($cached['titles']) && is_array($cached['titles'])) {
            $ttl = !empty($cached['titles']) ? 3600 : 300;
            if (time() - (int) $cached['t'] < $ttl) {
                return $cached['titles'];
            }
        }
    }

    $titles    = [];
    $serviceId = mcpServiceIdCached($identifier);
    if ($serviceId) {
        $jl = mcpApiGet("/api/{$serviceId}/jingle/list");
        $playlists = is_array($jl) && isset($jl['playlists']['data']) ? $jl['playlists']['data'] : [];
        foreach ($playlists as $pl) {
            $tracks = is_array($pl) && isset($pl['tracks']) && is_array($pl['tracks']) ? $pl['tracks'] : [];
            foreach ($tracks as $item) {
                $t      = is_array($item) && isset($item['track']) && is_array($item['track']) ? $item['track'] : [];
                $title  = (string) ($t['title'] ?? $item['title'] ?? '');
                $artist = (string) ($t['artist'] ?? $item['album_artist'] ?? '');
                $file   = (string) ($t['filename'] ?? '');
                $file   = preg_replace('/\.[a-z0-9]{2,4}$/i', '', $file); // drop extension
                if ($title !== '')  { $titles[jingleTitleNorm($title)] = true; }
                if ($file !== '')   { $titles[jingleTitleNorm($file)] = true; }
                if ($title !== '' && $artist !== '') {
                    $titles[jingleTitleNorm($title . ' - ' . $artist)] = true;
                    $titles[jingleTitleNorm($artist . ' - ' . $title)] = true;
                }
            }
        }
    }

    @file_put_contents($cacheFile, json_encode(['t' => time(), 'titles' => $titles]));
    return $titles;
}

// True when the given (cleaned) now-playing title is one of the station's
// jingles — by exact normalised match, or by the distinctive jingle title
// appearing inside the now-playing string (handles extra artist/junk + order).
function isJingleTitle($identifier, $cleanedTitle)
{
    $titles = getJingleTitles($identifier);
    if (!$titles) {
        return false;
    }
    $norm = jingleTitleNorm($cleanedTitle);
    if ($norm === '') {
        return false;
    }
    if (isset($titles[$norm])) {
        return true;
    }
    foreach ($titles as $jt => $_) {
        // Only "contains"-match on reasonably distinctive keys to avoid a short
        // common word (e.g. an artist "Vace") matching unrelated songs.
        if (mb_strlen($jt, 'UTF-8') >= 6 && mb_strpos($norm, $jt) !== false) {
            return true;
        }
    }
    return false;
}
