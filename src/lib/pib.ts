// Validacija PIB-a i matičnog broja po ISO 7064 MOD 11,10.
// Čista lokalna provera kontrolne cifre — hvata greške u kucanju bez mrežnog
// poziva. Isti algoritam radi i server (api/billing/Pib.php); mora se poklapati.

function mod1110(digits: string): number {
  let k = 10;
  for (const ch of digits) {
    k = (k + Number(ch)) % 10;
    if (k === 0) k = 10;
    k = (k * 2) % 11;
  }
  let control = 11 - k;
  if (control === 10) control = 0;
  else if (control === 11) control = 1;
  return control;
}

/** PIB je 9 cifara: 8 + kontrolna. */
export function isValidPIB(pib: string | null | undefined): boolean {
  const s = String(pib ?? '').trim();
  if (!/^\d{9}$/.test(s)) return false;
  return mod1110(s.slice(0, 8)) === Number(s[8]);
}

/**
 * Matični broj — SAMO provera formata (8 cifara). Namerno bez kontrolne cifre:
 * u opticaju su različite šeme i validator bi odbijao postojeće firme.
 */
export function isValidMaticniBroj(mb: string | null | undefined): boolean {
  return /^\d{8}$/.test(String(mb ?? '').trim());
}

/** Skida sve sem cifara (razmaci, tačke, crtice). */
export function normalizeId(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}
