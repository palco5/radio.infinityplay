<?php
/**
 * PDF faktura (prilog uz mejl) — renderuje se preko Dompdf-a.
 *
 * Dompdf ne podržava flexbox, pa je raspored TABELARNI (za razliku od
 * InvoiceTemplate.php koji je flex HTML za telo mejla). Font DejaVu Sans daje
 * ispravna srpska slova (č ć š đ ž). IPS QR se ubacuje kao data: URI slika.
 */

namespace Billing;

require_once __DIR__ . '/vendor/dompdf/autoload.inc.php';

use Dompdf\Dompdf;
use Dompdf\Options;

final class InvoicePdf
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

    /** Vraća PDF kao binarni string. */
    public static function render(array $invoice, array $client, array $company, string $qrDataUrl): string
    {
        $html = self::html($invoice, $client, $company, $qrDataUrl);

        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true); // dozvoli data: URI za QR sliku
        $options->set('chroot', sys_get_temp_dir());

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        return $dompdf->output();
    }

    private static function html(array $invoice, array $client, array $company, string $qrDataUrl): string
    {
        $stavke = is_string($invoice['stavke']) ? json_decode($invoice['stavke'], true) : $invoice['stavke'];
        $rows = '';
        $i = 0;
        foreach (($stavke ?: []) as $s) {
            $i++;
            $iznos = (float) $s['kolicina'] * (float) $s['cena'];
            $rows .= '<tr>'
                . '<td class="c">' . $i . '</td>'
                . '<td>' . self::e($s['naziv']) . '</td>'
                . '<td class="r">' . self::fmt($s['kolicina']) . '</td>'
                . '<td class="r">' . self::fmt($s['cena']) . '</td>'
                . '<td class="r">' . self::fmt($iznos) . '</td>'
                . "</tr>\n";
        }

        $uPdv = !empty($company['uSistemuPdv']);
        $pdvLabel = $uPdv ? ' 20%' : '';
        $napomenaPdv = $uPdv ? '' : 'Nije obveznik PDV-a — PDV nije obračunat u skladu sa članom 33. Zakona o PDV-u.<br>';

        return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { font-family: "DejaVu Sans", sans-serif; }
  body { color: #1a1a1a; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .muted { color: #666; font-size: 10px; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #888; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  .parties td { vertical-align: top; padding: 0 12px 0 0; width: 50%; }
  .items { margin-top: 18px; }
  .items th { text-align: left; font-size: 9px; text-transform: uppercase; color: #666; border-bottom: 1px solid #333; padding: 6px 5px; }
  .items td { padding: 6px 5px; border-bottom: 1px solid #eee; }
  .items .r { text-align: right; }
  .items .c { text-align: center; width: 24px; }
  .totals { margin-top: 6px; width: 45%; margin-left: 55%; }
  .totals td { padding: 3px 5px; }
  .totals .r { text-align: right; }
  .totals .grand td { border-top: 2px solid #1a1a1a; font-weight: bold; font-size: 13px; padding-top: 6px; }
  .pay { margin-top: 22px; background: #f5f5f3; border: 1px solid #e5e5e0; padding: 12px; }
  .pay td { vertical-align: middle; }
  .pay img { width: 120px; height: 120px; }
  .foot { margin-top: 20px; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
</style></head><body>

  <h1>' . self::e($company['naziv']) . '</h1>
  <div class="muted">' . self::e($company['adresa']) . ', ' . self::e($company['postanskiBroj']) . ' ' . self::e($company['grad'])
            . ' &middot; PIB ' . self::e($company['pib']) . ' &middot; MB ' . self::e($company['maticniBroj']) . '</div>

  <table class="parties" style="margin-top:16px"><tr>
    <td>
      <div class="label">Kupac</div>
      <strong>' . self::e($client['naziv']) . '</strong><br>'
            . self::e($client['adresa']) . ', ' . self::e($client['postanski_broj']) . ' ' . self::e($client['grad']) . '<br>'
            . 'PIB ' . self::e($client['pib']) . (trim((string) ($client['maticni_broj'] ?? '')) !== '' ? ' &middot; MB ' . self::e($client['maticni_broj']) : '') . '
    </td>
    <td>
      <div class="label">Faktura</div>
      <strong>' . self::e($invoice['broj_fakture']) . '</strong><br>
      Datum izdavanja: ' . self::d($invoice['datum_izdavanja']) . '<br>
      Datum prometa: ' . self::d($invoice['datum_prometa']) . '<br>
      <strong>Rok plaćanja: ' . self::d($invoice['datum_valute']) . '</strong>
    </td>
  </tr></table>

  <table class="items">
    <thead><tr><th class="c">#</th><th>Opis</th><th class="r">Kol.</th><th class="r">Cena</th><th class="r">Iznos</th></tr></thead>
    <tbody>' . $rows . '</tbody>
  </table>

  <table class="totals">
    <tr><td>Osnovica</td><td class="r">' . self::fmt($invoice['osnovica']) . ' RSD</td></tr>
    <tr><td>PDV' . $pdvLabel . '</td><td class="r">' . self::fmt($invoice['pdv']) . ' RSD</td></tr>
    <tr class="grand"><td>Za uplatu</td><td class="r">' . self::fmt($invoice['ukupno']) . ' RSD</td></tr>
  </table>

  <table class="pay"><tr>
    <td style="width:135px"><img src="' . $qrDataUrl . '" alt="IPS QR"></td>
    <td>
      <div class="label">Skenirajte u mobilnoj banci</div>
      Račun: <strong>' . self::e($company['racun']) . '</strong><br>
      Poziv na broj (97): <strong>' . self::e($invoice['poziv_na_broj']) . '</strong><br>
      Iznos: <strong>' . self::fmt($invoice['ukupno']) . ' RSD</strong>
    </td>
  </tr></table>

  <div class="foot">'
            . $napomenaPdv
            . 'Faktura je poslata i u Sistem elektronskih faktura (SEF).<br>'
            . self::e($company['naziv']) . ' &middot; ' . self::e($company['email']) . ' &middot; ' . self::e($company['telefon'] ?? '') . '
  </div>
</body></html>';
    }
}
