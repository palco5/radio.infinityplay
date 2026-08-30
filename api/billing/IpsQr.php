<?php
/**
 * NBS IPS QR kôd. Port iz infinityplay-billing/src/ips-qr.js.
 * QR se generiše LOKALNO (vendored TCPDF QRcode enkoder + GD render), da naplata
 * ne zavisi od dostupnosti NBS servisa. NBS validator se koristi samo u razvoju.
 *
 * Spec: https://ips.nbs.rs/PDF/Smernice_Generator_Validator_latinica.pdf
 */

namespace Billing;

require_once __DIR__ . '/vendor/qrcode.php';

final class IpsQr
{
    /** Vrednosti ne smeju da sadrže | (separator tagova). */
    private static function clean($value, ?int $maxLen = null): string
    {
        $s = trim(preg_replace('/\s+/', ' ', str_replace('|', ' ', (string) ($value ?? ''))));
        return $maxLen ? mb_substr($s, 0, $maxLen) : $s;
    }

    /** 3596.13 -> "RSD3596,13" */
    private static function formatAmount($amount, string $currency = 'RSD'): string
    {
        $n = (float) $amount;
        if (!is_finite($n) || $n <= 0) {
            throw new \InvalidArgumentException('Neispravan iznos za IPS QR.');
        }
        return $currency . str_replace('.', ',', number_format($n, 2, '.', ''));
    }

    /**
     * Sastavlja IPS QR string.
     * @param array $p racun(18 cifara), primalac, iznos, svrha, pozivNaBroj(ips), platilac?, sifraPlacanja?
     */
    public static function buildString(array $p): string
    {
        $acc = preg_replace('/\D/', '', (string) ($p['racun'] ?? ''));
        if (strlen($acc) !== 18) {
            throw new \InvalidArgumentException('Račun mora imati 18 cifara, dobijeno ' . strlen($acc) . '.');
        }

        $parts = [
            'K:PR',
            'V:01',
            'C:1',
            "R:{$acc}",
            'N:' . self::clean($p['primalac'] ?? '', 70),
            'I:' . self::formatAmount($p['iznos'] ?? 0),
        ];

        if (!empty($p['platilac'])) {
            $parts[] = 'P:' . self::clean($p['platilac'], 70);
        }

        $parts[] = 'SF:' . ($p['sifraPlacanja'] ?? '221');
        $parts[] = 'S:' . self::clean($p['svrha'] ?? '', 35);
        $parts[] = 'RO:' . preg_replace('/\D/', '', (string) ($p['pozivNaBroj'] ?? ''));

        return implode('|', $parts);
    }

    /**
     * Vraća data URL (PNG) spreman za <img src> u HTML fakturi/mejlu.
     * @param int $scale piksela po modulu, $margin modula quiet zone
     */
    public static function pngDataUrl(array $p, int $scale = 6, int $margin = 4): string
    {
        $payload = self::buildString($p);
        return 'data:image/png;base64,' . base64_encode(self::renderPng($payload, $scale, $margin));
    }

    /** Renderuje QR matricu (TCPDF QRcode) u PNG preko GD-a. */
    private static function renderPng(string $payload, int $scale, int $margin): string
    {
        // 'M' nivo korekcije — kompromis gustine i robusnosti (kao qrcode default).
        // Vendorovan qrcode.php baca bezopasne E_DEPRECATED (float->int) na PHP 8.5+;
        // utišavamo ih samo oko ovog poziva da ne zagađuju log/izlaz.
        $prev = error_reporting();
        error_reporting($prev & ~E_DEPRECATED);
        try {
            $qr = new \QRcode($payload, 'M');
            $arr = $qr->getBarcodeArray();
        } finally {
            error_reporting($prev);
        }
        if (empty($arr) || empty($arr['bcode'])) {
            throw new \RuntimeException('QR enkodiranje nije uspelo.');
        }

        $cols = (int) $arr['num_cols'];
        $rows = (int) $arr['num_rows'];
        $size = ($cols + 2 * $margin) * $scale;

        $img = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        imagefilledrectangle($img, 0, 0, $size, $size, $white);

        for ($r = 0; $r < $rows; $r++) {
            for ($c = 0; $c < $cols; $c++) {
                if (!empty($arr['bcode'][$r][$c])) {
                    $x = ($c + $margin) * $scale;
                    $y = ($r + $margin) * $scale;
                    imagefilledrectangle($img, $x, $y, $x + $scale - 1, $y + $scale - 1, $black);
                }
            }
        }

        ob_start();
        imagepng($img);
        $png = ob_get_clean();
        // (imagedestroy je no-op od PHP 8.0 i deprecated od 8.5 — GD resurs se sam oslobodi.)
        return $png;
    }
}
