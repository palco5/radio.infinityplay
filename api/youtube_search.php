<?php
require_once 'config.php';
setCORSHeaders();

$user = requireAuth();

$query          = trim($_GET['q'] ?? '');
$targetDuration = (int)($_GET['duration'] ?? 0); // iTunes duration in seconds

if (!$query) sendJSON(['error' => 'Query required'], 400);

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreVideo(array $v, int $targetDur): int {
    $score  = 0;
    $title  = mb_strtolower($v['title']  ?? '', 'UTF-8');
    $author = mb_strtolower($v['author'] ?? '', 'UTF-8');
    $len    = (int)($v['lengthSeconds']  ?? 0);

    // ── Channel boosts ──────────────────────────────────────────────────────
    // Topic = auto-generated official audio, best quality, no added effects
    if (strpos($author, '- topic') !== false || strpos($author, ' topic') !== false) {
        $score += 120;
    }
    if (strpos($author, 'official') !== false) $score += 25;
    if (strpos($author, 'vevo') !== false)     $score += 20;

    // ── Title boosts ────────────────────────────────────────────────────────
    if (strpos($title, 'official audio') !== false)   $score += 50;
    if (strpos($title, 'provided to youtube') !== false) $score += 40;
    if (strpos($title, 'audio') !== false)            $score += 10;

    // ── Duration match ──────────────────────────────────────────────────────
    if ($targetDur > 0 && $len > 0) {
        $diff = abs($len - $targetDur) / $targetDur;
        if ($diff < 0.03)      $score += 80; // within 3%
        elseif ($diff < 0.08)  $score += 55;
        elseif ($diff < 0.15)  $score += 30;
        elseif ($diff < 0.30)  $score += 10;
        else                   $score -= 60; // way off — probably wrong version
    }

    // ── Hard penalties ──────────────────────────────────────────────────────
    $badKeywords = [
        'live', 'nastup', 'koncert', 'concert', 'cover', 'karaoke',
        'speed up', 'sped up', 'speedup', 'spedup',
        'nightcore', 'reverb', 'slowed', 'remix',
        'acoustic', 'instrumental', 'piano version',
        'lyrics', 'lyric video', // lyric vids often have bad embeds
    ];
    foreach ($badKeywords as $kw) {
        if (strpos($title, $kw) !== false) $score -= 80;
    }

    // ── AI content — very strong penalty (these are never the original song) ──
    $aiKeywords = [
        'ai cover', 'ai remix', 'ai version', 'ai vocal', 'ai song',
        'a.i. cover', 'a.i. remix', 'a.i. version',
        'artificial intelligence', 'ai generated', 'ai-generated',
        'ai singing', 'ai voice',
    ];
    foreach ($aiKeywords as $kw) {
        if (strpos($title, $kw) !== false) $score -= 200;
    }

    // Shorts / clips
    if ($len > 0 && $len < 60)  $score -= 150; // definitely not a full song
    if ($len > 0 && $len < 100) $score -= 60;  // probably a short/preview
    if ($len > 700)             $score -= 30;  // probably a medley / compilation

    return $score;
}

// ── Invidious search ───────────────────────────────────────────────────────────
function searchInvidious(string $query, int $targetDur): ?array {
    $instances = [
        'https://inv.tux.pizza',
        'https://invidious.privacyredirect.com',
        'https://yt.artemislena.eu',
        'https://iv.melmac.space',
        'https://invidious.fdn.fr',
    ];

    $ctx = stream_context_create([
        'http' => [
            'timeout'       => 5,
            'ignore_errors' => true,
            'header'        => "User-Agent: Mozilla/5.0\r\n",
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);

    // Try with "topic" appended first, then plain query
    $queries = [$query . ' topic', $query];

    $allVideos = [];

    foreach ($queries as $q) {
        foreach ($instances as $inst) {
            $url  = $inst . '/api/v1/search?' . http_build_query(['q' => $q, 'type' => 'video']);
            $body = @file_get_contents($url, false, $ctx);
            if (!$body) continue;

            $items = json_decode($body, true);
            if (!is_array($items) || empty($items)) continue;

            foreach ($items as $item) {
                if (empty($item['videoId'])) continue;
                $allVideos[$item['videoId']] = $item; // deduplicate by ID
            }

            if (!empty($allVideos)) break; // got results from this instance
        }
        if (!empty($allVideos)) break; // got results from first query variant
    }

    if (empty($allVideos)) return null;

    // Score and sort
    $scored = [];
    foreach ($allVideos as $id => $v) {
        $scored[] = ['id' => $id, 'score' => scoreVideo($v, $targetDur), 'len' => $v['lengthSeconds'] ?? 0];
    }
    usort($scored, fn($a, $b) => $b['score'] - $a['score']);

    // Return top 3 IDs (all with positive or best score)
    return array_column(array_slice($scored, 0, 3), 'id');
}

// ── YouTube scraping fallback (no duration info, less accurate) ────────────────
function searchYouTubeScrape(string $query): array {
    $url = 'https://www.youtube.com/results?' . http_build_query([
        'search_query' => $query . ' topic',
    ]);
    $ctx = stream_context_create([
        'http' => [
            'timeout'       => 5,
            'follow_location' => 1,
            'header'        => implode("\r\n", [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language: en-US,en;q=0.9',
            ]),
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    $html = @file_get_contents($url, false, $ctx);
    if (!$html) return [];

    preg_match_all('/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/', $html, $m);
    return array_values(array_unique($m[1]));
}

// ── Main ───────────────────────────────────────────────────────────────────────
$ids = searchInvidious($query, $targetDuration);

if (empty($ids)) {
    $ids = searchYouTubeScrape($query);
    if (empty($ids)) sendJSON(['error' => 'Not found'], 404);
}

sendJSON([
    'videoId'  => $ids[0],
    'fallback' => array_slice($ids, 1),
]);
?>
