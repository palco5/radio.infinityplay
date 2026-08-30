<?php
/**
 * Poziv na broj po modelu 97 (ISO 7064 MOD 97-10). Port iz infinityplay-billing/
 * src/poziv-na-broj.js. Kičma automatskog zatvaranja faktura — svaka faktura
 * mora dobiti SVOJ jedinstven poziv na broj.
 */

namespace Billing;

final class PozivNaBroj
{
    /** Iterativni mod 97 nad decimalnim stringom — bez bcmath/gmp, tačan za bilo koju dužinu. */
    private static function mod97(string $digits): int
    {
        $r = 0;
        $len = strlen($digits);
        for ($i = 0; $i < $len; $i++) {
            $r = ($r * 10 + (int) $digits[$i]) % 97;
        }
        return $r;
    }

    /** Kontrolne cifre (dve) za datu osnovu. */
    public static function control(string $base): string
    {
        $digits = preg_replace('/\D/', '', $base);
        if ($digits === '') {
            throw new \InvalidArgumentException('Osnova poziva na broj je prazna.');
        }
        $control = 98 - self::mod97($digits . '00');
        return str_pad((string) $control, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Osnova = godina (2 cifre) + redni broj fakture (6 cifara).
     * @return array{model:string, control:string, base:string, formatted:string, ips:string}
     */
    public static function build(int $invoiceSeq, ?int $year = null): array
    {
        $year = $year ?? (int) date('Y');
        $base = substr((string) $year, -2) . str_pad((string) $invoiceSeq, 6, '0', STR_PAD_LEFT);
        $control = self::control($base);
        return [
            'model'     => '97',
            'control'   => $control,
            'base'      => $base,
            'formatted' => "{$control}-{$base}",  // za uplatnicu/fakturu: "12-260001234"
            'ips'       => "97{$control}{$base}",  // za IPS QR (tag RO): "9712260001234"
        ];
    }

    /**
     * Provera poziva na broj sa izvoda (za uparivanje uplata). Format KKbaza
     * (kontrola prvo), sa/bez crtice, sa/bez vodećeg "97".
     */
    public static function isValid($value, bool $hasModelPrefix = false): bool
    {
        $digits = preg_replace('/\D/', '', (string) ($value ?? ''));
        if ($hasModelPrefix) {
            $digits = substr($digits, 2);
        }
        if (strlen($digits) < 3) {
            return false;
        }
        $control = substr($digits, 0, 2);
        $base = substr($digits, 2);
        return self::mod97($base . $control) === 1;
    }

    /** Izvlači osnovu (bez kontrolnih cifara) iz poziva na broj sa izvoda. */
    public static function extractBase($value): string
    {
        $digits = preg_replace('/\D/', '', (string) ($value ?? ''));
        return substr($digits, 2);
    }
}
