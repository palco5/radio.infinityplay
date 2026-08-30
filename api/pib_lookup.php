<?php
/**
 * GET /api/pib_lookup.php?pib=100002887
 * Pretraga firme po PIB-u za auto-popunu checkout forme.
 *
 * Vraća:
 *   { "found": true,  "company": { naziv, adresa, grad, postanski_broj, maticni_broj } }
 *   { "found": false, "source_configured": false }   // nema podešenog izvora -> ručni unos
 *   { "found": false, "source_configured": true  }   // izvor radi ali firma nije nađena
 *
 * VAŽNO: besplatni javni izvori (APR/NBS) aktivno blokiraju automatski (server)
 * pristup preko WAF-a, pa nisu upotrebljivi. Za stvarnu auto-popunu potreban je
 * komercijalni API — podesi PIB_LOOKUP_URL i PIB_LOOKUP_KEY u config.php i
 * (po potrebi) prilagodi mapiranje polja u lookupViaProvider().
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/billing/Pib.php';

use Billing\Pib;

setCORSHeaders();

// Pretraga po MATIČNOM BROJU (lokalni registar company_registry) — primarni izvor.
$mb = Pib::normalizeId($_GET['mb'] ?? '');
if ($mb !== '') {
    if (!preg_match('/^\d{8}$/', $mb)) {
        sendJSON(['found' => false, 'error' => 'invalid_mb', 'source_configured' => true]);
    }
    $company = lookupCompanyByMb($mb);
    if ($company) {
        sendJSON(['found' => true, 'company' => $company, 'status' => $company['_status'] ?? null]);
    }
    sendJSON(['found' => false, 'source_configured' => true]);
}

// Pretraga po PIB-u (komercijalni API, ako je podešen) — sekundarno/opciono.
$pib = Pib::normalizeId($_GET['pib'] ?? '');
if (!Pib::isValidPIB($pib)) {
    sendJSON(['found' => false, 'error' => 'invalid_pib', 'source_configured' => sourceConfigured()]);
}

$company = lookupCompanyByPib($pib);
if ($company) {
    sendJSON(['found' => true, 'company' => $company]);
}
sendJSON(['found' => false, 'source_configured' => sourceConfigured()]);

// ─────────────────────────────────────────────────────────────────────────────

function sourceConfigured(): bool
{
    return defined('PIB_LOOKUP_URL') && PIB_LOOKUP_URL !== '';
}

/**
 * Pretraga firme po matičnom broju u lokalnom registru (company_registry).
 * Registar ima naziv i opštinu (grad); PIB, adresa i poštanski broj NISU u
 * podacima pa ostaju za ručni unos.
 * @return array|null
 */
function lookupCompanyByMb(string $mb): ?array
{
    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT naziv, opstina, status FROM company_registry WHERE maticni_broj = ?');
        $stmt->execute([$mb]);
        $row = $stmt->fetch();
    } catch (\Throwable $e) {
        error_log('company_registry lookup error: ' . $e->getMessage());
        return null; // npr. tabela još nije uvezena -> tiho ručni unos
    }
    if (!$row) {
        return null;
    }
    return [
        'naziv'          => $row['naziv'],
        'adresa'         => '',
        'grad'           => $row['opstina'],
        'postanski_broj' => '',
        'maticni_broj'   => $mb,
        '_status'        => $row['status'],
    ];
}

/**
 * Pluggable pretraga. Vraća normalizovan niz polja ili null.
 * @return array{naziv:string,adresa:string,grad:string,postanski_broj:string,maticni_broj:string}|null
 */
function lookupCompanyByPib(string $pib): ?array
{
    if (!sourceConfigured()) {
        return null; // nema izvora -> klijent unosi ručno
    }
    try {
        return lookupViaProvider($pib);
    } catch (\Throwable $e) {
        error_log('pib_lookup provider error: ' . $e->getMessage());
        return null; // greška izvora ne sme da blokira checkout
    }
}

/**
 * Poziv komercijalnog provajdera. Podrazumeva JSON odgovor; mapiranje polja
 * PRILAGODI prema dokumentaciji svog provajdera (nazivi ključeva se razlikuju).
 */
function lookupViaProvider(string $pib): ?array
{
    $url = PIB_LOOKUP_URL . (str_contains(PIB_LOOKUP_URL, '?') ? '&' : '?') . 'pib=' . urlencode($pib);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            // Većina provajdera koristi Bearer ili x-api-key — ostavljena su oba,
            // bezopasno je poslati; obriši ono što tvoj provajder ne koristi.
            'Authorization: Bearer ' . PIB_LOOKUP_KEY,
            'x-api-key: ' . PIB_LOOKUP_KEY,
        ],
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status < 200 || $status >= 300 || !$raw) {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return null;
    }

    // Neki provajderi vraćaju objekat, neki { data: {...} } ili { results: [ {...} ] }.
    $c = $data['data'] ?? $data['company'] ?? $data['results'][0] ?? $data['items'][0] ?? $data;

    // Mapiranje raznih uobičajenih naziva ključeva -> naša polja.
    $naziv   = firstNonEmpty($c, ['naziv', 'name', 'companyName', 'fullName', 'punNaziv']);
    $adresa  = firstNonEmpty($c, ['adresa', 'address', 'street', 'ulica', 'sedisteAdresa']);
    $grad    = firstNonEmpty($c, ['grad', 'city', 'mesto', 'sedisteGrad', 'opstina']);
    $ptt     = firstNonEmpty($c, ['postanski_broj', 'postanskiBroj', 'zip', 'postalCode', 'ptt']);
    $mb      = Pib::normalizeId(firstNonEmpty($c, ['maticni_broj', 'maticniBroj', 'registrationNumber', 'mb', 'regNo']));

    if ($naziv === '') {
        return null; // bez naziva nema smisla
    }

    return [
        'naziv'          => $naziv,
        'adresa'         => $adresa,
        'grad'           => $grad,
        'postanski_broj' => $ptt,
        'maticni_broj'   => $mb,
    ];
}

/** Vrati prvu nepraznu vrednost iz $arr za bilo koji od datih ključeva. */
function firstNonEmpty(array $arr, array $keys): string
{
    foreach ($keys as $k) {
        if (isset($arr[$k]) && trim((string) $arr[$k]) !== '') {
            return trim((string) $arr[$k]);
        }
    }
    return '';
}
