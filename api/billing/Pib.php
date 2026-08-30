<?php
/**
 * Validacija PIB-a i matičnog broja po ISO 7064 MOD 11,10 (server strana).
 * Isti algoritam kao src/lib/pib.ts — mora se poklapati bit-za-bit, jer klijent
 * i server proveravaju istu stvar. Port iz modula infinityplay-billing/src/pib.js.
 */

namespace Billing;

final class Pib
{
    private static function mod1110(string $digits): int
    {
        $k = 10;
        $len = strlen($digits);
        for ($i = 0; $i < $len; $i++) {
            $k = ($k + (int) $digits[$i]) % 10;
            if ($k === 0) {
                $k = 10;
            }
            $k = ($k * 2) % 11;
        }
        $control = 11 - $k;
        if ($control === 10) {
            $control = 0;
        } elseif ($control === 11) {
            $control = 1;
        }
        return $control;
    }

    /** PIB je 9 cifara: 8 + kontrolna. */
    public static function isValidPIB($pib): bool
    {
        $s = trim((string) ($pib ?? ''));
        if (!preg_match('/^\d{9}$/', $s)) {
            return false;
        }
        return self::mod1110(substr($s, 0, 8)) === (int) $s[8];
    }

    /** Matični broj — samo format (8 cifara), namerno bez kontrolne cifre. */
    public static function isValidMaticniBroj($mb): bool
    {
        return (bool) preg_match('/^\d{8}$/', trim((string) ($mb ?? '')));
    }

    /** Skida sve sem cifara. */
    public static function normalizeId($value): string
    {
        return preg_replace('/\D/', '', (string) ($value ?? ''));
    }
}
