<?php
/**
 * HTML šablon fakture sa IPS QR kodom. Port iz infinityplay-billing/
 * src/invoice-template.js. Ovaj HTML ide direktno u mejl (QR je ugrađen kao
 * data URL, pa nema eksternih resursa koje bi mejl klijent blokirao).
 */

namespace Billing;

final class InvoiceTemplate
{
    private static function fmt($n): string
    {
        return number_format((float) $n, 2, ',', '.');
    }

    private static function d($value): string
    {
        return date('d.m.Y.', strtotime((string) $value));
    }

    private static function e($v): string
    {
        return htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
    }

    /**
     * @param array $invoice red iz `invoices` (+ dekodirane stavke)
     * @param array $client  red iz `billing_clients`
     * @param array $company podaci naše firme (naziv, adresa, grad, postanskiBroj, pib, maticniBroj, racun, email, telefon, uSistemuPdv)
     * @param string $qrDataUrl data URL PNG IPS QR koda
     */
    public static function render(array $invoice, array $client, array $company, string $qrDataUrl): string
    {
        $stavke = is_string($invoice['stavke']) ? json_decode($invoice['stavke'], true) : $invoice['stavke'];
        $rows = '';
        $i = 0;
        foreach (($stavke ?: []) as $s) {
            $i++;
            $iznos = (float) $s['kolicina'] * (float) $s['cena'];
            $rows .= '<tr><td>' . $i . '</td><td>' . self::e($s['naziv']) . '</td>'
                . '<td class="r">' . self::fmt($s['kolicina']) . '</td>'
                . '<td class="r">' . self::fmt($s['cena']) . '</td>'
                . '<td class="r">' . self::fmt($iznos) . "</td></tr>\n";
        }

        $uPdv = !empty($company['uSistemuPdv']);
        $pdvLabel = $uPdv ? ' 20%' : '';
        $napomenaPdv = $uPdv ? '' : 'Nije obveznik PDV-a — PDV nije obračunat u skladu sa članom 33. Zakona o PDV-u.<br>';

        return '<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><title>Faktura ' . self::e($invoice['broj_fakture']) . '</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; font-size: 14px; line-height: 1.5; max-width: 760px; margin: 0 auto; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; }
  .cols { display: flex; gap: 32px; margin: 24px 0; }
  .cols > div { flex: 1; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; border-bottom: 1px solid #ddd; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; }
  .r { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals td { border: none; padding: 4px 6px; }
  .totals .grand td { border-top: 2px solid #1a1a1a; font-weight: 600; font-size: 16px; padding-top: 10px; }
  .pay { display: flex; gap: 24px; align-items: center; background: #f7f7f5; border-radius: 8px; padding: 20px; margin-top: 28px; }
  .pay img { width: 140px; height: 140px; }
  .foot { margin-top: 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
</style></head><body>
  <h1>' . self::e($company['naziv']) . '</h1>
  <div class="muted">' . self::e($company['adresa']) . ', ' . self::e($company['postanskiBroj']) . ' ' . self::e($company['grad'])
            . ' &middot; PIB ' . self::e($company['pib']) . ' &middot; MB ' . self::e($company['maticniBroj']) . '</div>

  <div class="cols">
    <div>
      <div class="label">Kupac</div>
      <strong>' . self::e($client['naziv']) . '</strong><br>
      ' . self::e($client['adresa']) . ', ' . self::e($client['postanski_broj']) . ' ' . self::e($client['grad']) . '<br>
      PIB ' . self::e($client['pib']) . ' &middot; MB ' . self::e($client['maticni_broj']) . '
    </div>
    <div>
      <div class="label">Faktura</div>
      <strong>' . self::e($invoice['broj_fakture']) . '</strong><br>
      Datum izdavanja: ' . self::d($invoice['datum_izdavanja']) . '<br>
      Datum prometa: ' . self::d($invoice['datum_prometa']) . '<br>
      <strong>Rok plaćanja: ' . self::d($invoice['datum_valute']) . '</strong>
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Opis</th><th class="r">Kol.</th><th class="r">Cena</th><th class="r">Iznos</th></tr></thead>
    <tbody>' . $rows . '</tbody>
  </table>

  <table class="totals">
    <tr><td>Osnovica</td><td class="r">' . self::fmt($invoice['osnovica']) . ' RSD</td></tr>
    <tr><td>PDV' . $pdvLabel . '</td><td class="r">' . self::fmt($invoice['pdv']) . ' RSD</td></tr>
    <tr class="grand"><td>Za uplatu</td><td class="r">' . self::fmt($invoice['ukupno']) . ' RSD</td></tr>
  </table>

  <div class="pay">
    <img src="' . $qrDataUrl . '" alt="IPS QR kôd za plaćanje">
    <div>
      <div class="label">Skenirajte u mobilnoj banci</div>
      Račun: <strong>' . self::e($company['racun']) . '</strong><br>
      Poziv na broj (97): <strong>' . self::e($invoice['poziv_na_broj']) . '</strong><br>
      Iznos: <strong>' . self::fmt($invoice['ukupno']) . ' RSD</strong>
      <div class="muted" style="margin-top:6px">Svi podaci su već u kôdu — samo potvrdite plaćanje.</div>
    </div>
  </div>

  <div class="foot">
    ' . $napomenaPdv . '
    Faktura je poslata i u Sistem elektronskih faktura (SEF) i dostupna je u vašem SEF nalogu.<br>
    ' . self::e($company['naziv']) . ' &middot; ' . self::e($company['email']) . ' &middot; ' . self::e($company['telefon'] ?? '') . '
  </div>
</body></html>';
    }
}
