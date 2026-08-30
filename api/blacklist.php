<?php
require_once 'config.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$currentUser = requireAuth();
$db = getDB();

// Self-heal: create the per-user blacklist table.
// A blacklist entry blocks either a whole artist (block_type='artist', title
// NULL) or a single song (block_type='song', artist + title). Enforcement is
// per-user and client-side: shared live streams can't be filtered at the
// source without affecting every listener, so the player mutes/skips blocked
// tracks locally for this user only.
try {
    $db->exec("CREATE TABLE IF NOT EXISTS user_blacklist (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        block_type VARCHAR(10) NOT NULL,
        artist VARCHAR(255) NOT NULL DEFAULT '',
        title VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) { /* ignore */ }

// Normalize a name for duplicate detection (lower-case, collapse whitespace).
function blNorm($s)
{
    $s = mb_strtolower(trim((string) $s), 'UTF-8');
    return preg_replace('/\s+/u', ' ', $s);
}

// ─────────────────────────────────────────────────────────────
// MediaCP REST API helpers (used to really skip a track on a user's
// personal "Moj Radio" AutoDJ station — the only station where a skip is
// per-user, since it isn't shared with other listeners).
// Auth: Bearer <MEDIACP_API_KEY>, port 2020. See media-service/skip-track.
// ─────────────────────────────────────────────────────────────

// Perform a MediaCP API request. Returns the decoded JSON (array) or null.
// $status receives the HTTP status code (0 if the request never got through),
// so callers can tell "endpoint worked but body wasn't JSON" from a real failure.
function mediaCPRequest($method, $path, &$status = null)
{
    $status = 0;
    if (!defined('MEDIACP_API_URL') || !MEDIACP_API_URL || !defined('MEDIACP_API_KEY') || !MEDIACP_API_KEY) {
        return null;
    }
    $host = parse_url(MEDIACP_API_URL, PHP_URL_HOST);
    if (!$host) {
        return null;
    }
    // Use standard HTTPS (443), NOT :2020 — the Loopia backend can't reach the
    // MediaCP panel on :2020 (outbound blocked), but the same REST API is also
    // served on 443, which Loopia can reach.
    $url = 'https://' . $host . $path;
    $context = stream_context_create([
        'http' => [
            'method'        => $method,
            'header'        => "Authorization: Bearer " . MEDIACP_API_KEY . "\r\nAccept: application/json\r\n",
            'timeout'       => 12,
            'ignore_errors' => true,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    // The Loopia→MediaCP hop is flaky, so retry once on a failed read.
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $response = @file_get_contents($url, false, $context);
        if ($response !== false) {
            // PHP 8.5+ deprecates $http_response_header in favour of
            // http_get_last_response_headers(); support both.
            $headers = function_exists('http_get_last_response_headers')
                ? (http_get_last_response_headers() ?? [])
                : ($http_response_header ?? []);
            if (isset($headers[0]) && preg_match('/\s(\d{3})\s/', $headers[0], $m)) {
                $status = (int) $m[1];
            }
            return json_decode($response, true);
        }
    }
    return null;
}

// Pull the mount/slug/unique_id out of a stream URL, e.g.
// https://media.infinityplay.rs/stream/ZlatnaKruna -> ZlatnaKruna
function mediaCPIdentifierFromUrl($url)
{
    $path = trim((string) parse_url((string) $url, PHP_URL_PATH), '/');
    if ($path === '') {
        return null;
    }
    $segments = explode('/', $path);
    return end($segments) ?: null;
}

// Resolve a stream identifier (slug / unique_id / numeric id) to the MediaCP
// media-service id needed for per-service API calls. Lists services (admin
// scope) and matches on id / slug / unique_id / mountpoints. Returns int or null.
function mediaCPResolveServiceId($identifier)
{
    if ($identifier === null || $identifier === '') {
        return null;
    }
    $needle = mb_strtolower((string) $identifier, 'UTF-8');

    for ($page = 1; $page <= 25; $page++) {
        $data = mediaCPRequest('GET', "/api/0/media-service/list?page={$page}");
        if (!is_array($data)) {
            return null;
        }
        // The list endpoint may return a bare array or a paginated
        // { data: [...], last_page: n } envelope — handle both.
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
        // A bare-array response has no last_page — keep paging until an empty
        // page (the count()===0 break above); only a paginated envelope can
        // tell us we're done early. Assuming last_page = current page made the
        // search silently stop after page 1, so services beyond the first 15
        // could never be resolved.
        if (isset($data['last_page']) && $page >= (int) $data['last_page']) {
            break;
        }
    }
    return null;
}

// Resolve + cache the MediaCP service id for an identifier (24h). Same cache
// files as nowplaying.php (`ip_svcid_*`), which polls constantly — so the
// cache is almost always warm and the flaky multi-page service listing is
// skipped entirely. Only a SUCCESSFUL resolve is cached.
function mediaCPServiceIdCacheFile($identifier)
{
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string) $identifier);
    return sys_get_temp_dir() . '/ip_svcid_' . $safe . '.json';
}

function mediaCPServiceIdCached($identifier)
{
    $cf = mediaCPServiceIdCacheFile($identifier);
    if (is_file($cf)) {
        $c = json_decode((string) @file_get_contents($cf), true);
        if (is_array($c) && !empty($c['id']) && (time() - (int) ($c['t'] ?? 0) < 86400)) {
            return (int) $c['id'];
        }
    }
    $id = mediaCPResolveServiceId($identifier);
    if ($id) {
        @file_put_contents($cf, json_encode(['t' => time(), 'id' => $id]));
    }
    return $id;
}

// POST ?action=skip — really skip the current track on the user's personal
// "Moj Radio" AutoDJ station via MediaCP. Safe (reversible): it only advances
// playout; nothing is removed. Only meaningful for a personal station — never
// call this for a shared stream, where a skip would affect every listener.
if ($method === 'POST' && ($_GET['action'] ?? '') === 'skip') {
    $data = getRequestBody() ?? [];
    $streamUrl = trim((string) ($data['stream_url'] ?? ''));
    if ($streamUrl === '') {
        sendJSON(['error' => 'stream_url is required'], 400);
    }

    $identifier = mediaCPIdentifierFromUrl($streamUrl);
    $serviceId = $identifier ? mediaCPServiceIdCached($identifier) : null;
    if (!$serviceId) {
        // Couldn't map the stream to a MediaCP service — the client falls back
        // to local muting, so this isn't fatal.
        sendJSON(['ok' => false, 'reason' => 'service_not_found', 'identifier' => $identifier], 200);
    }

    // The HTTP status decides success: 2xx = skipped (even with a non-JSON
    // body); 4xx/5xx = failed (even if the error body is valid JSON). Only
    // when no status could be read do we fall back to "got a JSON body".
    $skipOk = function ($status, $result) {
        return $status ? ($status >= 200 && $status < 300) : ($result !== null);
    };

    $result = mediaCPRequest('GET', "/api/{$serviceId}/media-service/skip-track", $status);
    $ok = $skipOk($status, $result);
    if (!$ok && $status === 404) {
        // Stale cached id (service was recreated) — drop it and retry once
        // with a fresh resolve.
        @unlink(mediaCPServiceIdCacheFile($identifier));
        $serviceId = mediaCPResolveServiceId($identifier);
        if ($serviceId) {
            @file_put_contents(mediaCPServiceIdCacheFile($identifier), json_encode(['t' => time(), 'id' => $serviceId]));
            $result = mediaCPRequest('GET', "/api/{$serviceId}/media-service/skip-track", $status);
            $ok = $skipOk($status, $result);
        }
    }
    sendJSON([
        'ok'         => $ok,
        'status'     => $status,
        'service_id' => $serviceId,
        'identifier' => $identifier,
        'mediacp'    => $result,
    ]);
}

// GET — list a blacklist, newest first. Admin sme da vidi blacklist-u DRUGOG
// korisnika preko ?user_id= (za pregled naloga u admin panelu); ostali samo svoju.
if ($method === 'GET') {
    $targetUserId = $currentUser['userId'];
    $requested = $_GET['user_id'] ?? '';
    if ($requested !== '' && $requested !== $currentUser['userId']) {
        $chk = $db->prepare("SELECT is_admin, email FROM profiles WHERE id = ?");
        $chk->execute([$currentUser['userId']]);
        $me = $chk->fetch();
        $isAdmin = ($me && $me['is_admin']) || in_array($me['email'] ?? '', ['darkospira@gmail.com', 'info@infinityplay.rs'], true);
        if (!$isAdmin) {
            sendJSON(['error' => 'Forbidden'], 403);
        }
        $targetUserId = $requested;
    }
    // Auto-pomirenje: skini sa blacklist-e pesme koje su opet u MediaCP-u (vraćene).
    try { blReconcileMojRadio($db, $targetUserId); } catch (\Throwable $e) { /* best-effort */ }
    $stmt = $db->prepare("SELECT id, block_type, artist, title, created_at
        FROM user_blacklist WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$targetUserId]);
    sendJSON(['blacklist' => $stmt->fetchAll()]);
}

// POST — add a song or artist to the blacklist
if ($method === 'POST') {
    $data = getRequestBody() ?? [];
    $blockType = $data['block_type'] ?? '';
    $artist = trim((string) ($data['artist'] ?? ''));
    $title = trim((string) ($data['title'] ?? ''));

    if ($blockType !== 'song' && $blockType !== 'artist') {
        sendJSON(['error' => 'block_type must be "song" or "artist"'], 400);
    }
    if ($blockType === 'artist') {
        $title = null;
        if ($artist === '') {
            sendJSON(['error' => 'artist is required'], 400);
        }
    } else {
        // A song needs at least a title; artist may be empty for stream titles
        // that don't split cleanly into "Artist - Title".
        if ($title === '') {
            sendJSON(['error' => 'title is required for a song'], 400);
        }
    }

    // Skip exact duplicates (case-insensitive) so the list stays clean.
    if ($blockType === 'artist') {
        $existing = $db->prepare("SELECT id FROM user_blacklist
            WHERE user_id = ? AND block_type = 'artist' AND LOWER(artist) = ?");
        $existing->execute([$currentUser['userId'], blNorm($artist)]);
    } else {
        $existing = $db->prepare("SELECT id FROM user_blacklist
            WHERE user_id = ? AND block_type = 'song' AND LOWER(artist) = ? AND LOWER(title) = ?");
        $existing->execute([$currentUser['userId'], blNorm($artist), blNorm($title)]);
    }
    if ($row = $existing->fetch()) {
        sendJSON(['message' => 'Already blocked', 'id' => $row['id']]);
    }

    $id = generateUUID();
    $stmt = $db->prepare("INSERT INTO user_blacklist (id, user_id, block_type, artist, title)
        VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$id, $currentUser['userId'], $blockType, $artist, $title]);

    // Trajno ukloni iz korisnikovog Moj Radio (MediaCP). Best-effort: greška ne
    // ruši blok (klijentsko utišavanje ostaje). Na localhostu (dry-run) samo loguje.
    $media = ['applied' => false];
    try {
        $media = blApplyToMojRadio($db, $currentUser['userId'], $blockType, $artist, $title);
    } catch (\Throwable $e) {
        error_log('blacklist media apply failed: ' . $e->getMessage());
    }

    sendJSON([
        'entry' => [
            'id' => $id,
            'block_type' => $blockType,
            'artist' => $artist,
            'title' => $title,
        ],
        'media' => $media,
    ], 201);
}

// DELETE — remove an entry (unblock)
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        sendJSON(['error' => 'id is required'], 400);
    }
    $stmt = $db->prepare("DELETE FROM user_blacklist WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $currentUser['userId']]);
    sendJSON(['message' => 'Removed']);
}

sendJSON(['error' => 'Method not allowed'], 405);

// ─── MediaCP: trajno uklanjanje blokiranog iz korisnikovog Moj Radio ──────────

/**
 * Jači normalizator za UPARIVANJE: mala slova, izbaci (zagrade)/[uglaste],
 * česte ključne reči (official/video/audio/hd/feat…) i sve sem slova/cifara.
 * Tako "Balenciaga (128kbit_AAC)" ~ "balenciaga".
 */
function blMatchNorm($s)
{
    $s = mb_strtolower((string) $s, 'UTF-8');
    $s = preg_replace('/\([^)]*\)|\[[^\]]*\]/u', ' ', $s);
    $s = preg_replace('/\b(official|video|audio|hd|lyrics?|spot|cover|remix|prod|ft|feat|featuring)\b/u', ' ', $s);
    $s = preg_replace('/[^\p{L}\p{N}]+/u', '', (string) $s);
    return (string) $s;
}

/** Rotacione mete: folderi + direktne pesme iz plejlisti u general_rotation. */
function blRotationTargets($serviceId)
{
    $folders = [];
    $tracks = [];
    $pl = mediaCPRequest('GET', "/api/{$serviceId}/audio-playlist/list");
    foreach (($pl['playlists']['data'] ?? []) as $p) {
        if (empty($p['general_rotation']) || (isset($p['status']) && (int) $p['status'] !== 1)) {
            continue;
        }
        $items = mediaCPRequest('GET', "/api/{$serviceId}/playlist-track/list/{$p['id']}?type=general");
        foreach (($items['tracks'] ?? []) as $t) {
            if (($t['type'] ?? '') === 'folder' && !empty($t['path'])) {
                $folders[$t['path']] = true;
            } elseif (!empty($t['track_id'])) {
                $tracks[(int) $t['track_id']] = ['artist' => $t['artist'] ?? '', 'title' => $t['title'] ?? ''];
            }
        }
    }
    return ['folders' => array_keys($folders), 'tracks' => $tracks];
}

/** Nađi track_id-eve u Moj Radio rotaciji koji odgovaraju bloku (pesma/izvođač). */
function blFindMatches($serviceId, $blockType, $artist, $title)
{
    $na = blMatchNorm($artist);
    $nt = blMatchNorm($title);

    $matchOne = fn ($tArtist, $tTitle) => blTrackMatches($blockType, $na, $nt, $tArtist, $tTitle);

    $matches = [];
    $targets = blRotationTargets($serviceId);
    foreach ($targets['tracks'] as $tid => $meta) {
        if ($matchOne($meta['artist'], $meta['title'])) {
            $matches[$tid] = true;
        }
    }
    foreach ($targets['folders'] as $folder) {
        for ($page = 1; $page <= 40; $page++) {
            $ml = mediaCPRequest('GET', "/api/{$serviceId}/media/list?path=" . rawurlencode($folder) . "&page={$page}");
            $data = $ml['tracks']['data'] ?? [];
            if (!$data) {
                break;
            }
            foreach ($data as $t) {
                if (!empty($t['id']) && $matchOne($t['artist'] ?? '', $t['title'] ?? '')) {
                    $matches[(int) $t['id']] = true;
                }
            }
            if ($page >= (int) ($ml['tracks']['last_page'] ?? 1)) {
                break;
            }
        }
    }
    return array_keys($matches);
}

/** Obriši (ili dry-run) blokirano iz korisnikovog Moj Radio. Vraća rezime. */
function blApplyToMojRadio($db, $userId, $blockType, $artist, $title)
{
    $stmt = $db->prepare('SELECT my_radio_stream_url FROM profiles WHERE id = ?');
    $stmt->execute([$userId]);
    $streamUrl = $stmt->fetchColumn();
    if (!$streamUrl) {
        return ['applied' => false, 'reason' => 'no_moj_radio'];
    }
    $identifier = mediaCPIdentifierFromUrl($streamUrl);
    $serviceId = $identifier ? mediaCPServiceIdCached($identifier) : null;
    if (!$serviceId) {
        return ['applied' => false, 'reason' => 'service_not_found'];
    }

    $ids = blFindMatches($serviceId, $blockType, $artist, $title);
    if (!$ids) {
        return ['applied' => true, 'deleted' => 0, 'ids' => []];
    }

    $dryRun = defined('MEDIACP_DELETE_DRYRUN') && MEDIACP_DELETE_DRYRUN;
    if ($dryRun) {
        error_log("[blacklist DRYRUN] svc {$serviceId} bi obrisao " . count($ids) . " pesama: " . implode(',', $ids));
        return ['applied' => true, 'dry_run' => true, 'deleted' => count($ids), 'ids' => $ids];
    }

    foreach (array_chunk($ids, 25) as $chunk) {
        $qs = [];
        foreach ($chunk as $i => $tid) {
            $qs[] = 'tracks[' . $i . ']=' . (int) $tid;
        }
        mediaCPRequest('DELETE', "/api/{$serviceId}/media/delete?" . implode('&', $qs), $st);
    }
    return ['applied' => true, 'deleted' => count($ids), 'ids' => $ids];
}

/** Da li track (artist/title) odgovara bloku. $na/$nt su već blMatchNorm-ovani. */
function blTrackMatches($blockType, $na, $nt, $trackArtist, $trackTitle)
{
    $a = blMatchNorm($trackArtist);
    $ti = blMatchNorm($trackTitle);
    if ($blockType === 'artist') {
        return $a !== '' && $na !== '' && $a === $na;
    }
    if ($nt === '') {
        return false;
    }
    $titleOk = ($ti === $nt) || strpos($ti, $nt) === 0 || strpos($nt, $ti) === 0;
    // Izvođač labavije za pesmu: now-playing daje očišćeno ("Jala"), biblioteka
    // pun sastav ("Jala & Buba Corelli") — dovoljno da se jedan sadrži u drugom.
    $artistOk = ($na === '') || ($a !== '' && (strpos($a, $na) !== false || strpos($na, $a) !== false));
    return $titleOk && $artistOk;
}

/**
 * Auto-pomirenje: ako je neka BLOKIRANA pesma opet prisutna u korisnikovom Moj
 * Radio (admin je vratio/re-upload-ovao), skloni je sa blacklist-e — tako se ne
 * skipuje više. Radi SAMO kad je brisanje stvarno (ne dry-run), jer bi inače na
 * localhostu (gde ništa nije obrisano) odmah poništila sve blokade. Throttle 5min.
 */
function blReconcileMojRadio($db, $userId)
{
    if (defined('MEDIACP_DELETE_DRYRUN') && MEDIACP_DELETE_DRYRUN) {
        return;
    }
    $cf = sys_get_temp_dir() . '/ip_blrec_' . preg_replace('/[^a-zA-Z0-9]/', '_', (string) $userId) . '.json';
    if (is_file($cf)) {
        $c = json_decode((string) @file_get_contents($cf), true);
        if (is_array($c) && (time() - (int) ($c['t'] ?? 0) < 300)) {
            return;
        }
    }
    @file_put_contents($cf, json_encode(['t' => time()]));

    $q = $db->prepare('SELECT id, block_type, artist, title FROM user_blacklist WHERE user_id = ?');
    $q->execute([$userId]);
    $rows = $q->fetchAll();
    if (!$rows) {
        return;
    }

    $s = $db->prepare('SELECT my_radio_stream_url FROM profiles WHERE id = ?');
    $s->execute([$userId]);
    $streamUrl = $s->fetchColumn();
    if (!$streamUrl) {
        return;
    }
    $identifier = mediaCPIdentifierFromUrl($streamUrl);
    $serviceId = $identifier ? mediaCPServiceIdCached($identifier) : null;
    if (!$serviceId) {
        return;
    }

    // Skupi sve pesme iz rotacije jednom.
    $lib = [];
    $targets = blRotationTargets($serviceId);
    foreach ($targets['tracks'] as $meta) {
        $lib[] = [$meta['artist'] ?? '', $meta['title'] ?? ''];
    }
    foreach ($targets['folders'] as $folder) {
        for ($page = 1; $page <= 40; $page++) {
            $ml = mediaCPRequest('GET', "/api/{$serviceId}/media/list?path=" . rawurlencode($folder) . "&page={$page}");
            $data = $ml['tracks']['data'] ?? [];
            if (!$data) {
                break;
            }
            foreach ($data as $t) {
                $lib[] = [$t['artist'] ?? '', $t['title'] ?? ''];
            }
            if ($page >= (int) ($ml['tracks']['last_page'] ?? 1)) {
                break;
            }
        }
    }

    $del = $db->prepare('DELETE FROM user_blacklist WHERE id = ?');
    foreach ($rows as $e) {
        $na = blMatchNorm($e['artist']);
        $nt = blMatchNorm($e['title']);
        foreach ($lib as $lt) {
            if (blTrackMatches($e['block_type'], $na, $nt, $lt[0], $lt[1])) {
                $del->execute([$e['id']]);
                error_log("[blacklist reconcile] svc {$serviceId}: vraćena pesma, skinuta blokada '{$e['artist']} - {$e['title']}'");
                break;
            }
        }
    }
}
?>
