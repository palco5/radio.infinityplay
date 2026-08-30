<?php
/**
 * Generator UBL 2.1 XML fakture po srpskom CIUS-u (EN 16931-1).
 * Port iz infinityplay-billing/src/ubl.js.
 *
 * Radni tok: generiši XML -> provuci kroz zvanični validator
 * (https://www.efaktura.gov.rs/tekst/342/) -> tek onda šalji na SEF.
 * PROVERI da li ima novija verzija internog tehničkog uputstva pre produkcije.
 */

namespace Billing;

final class Ubl
{
    private const CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021';

    private static function esc($value): string
    {
        return str_replace(
            ['&', '<', '>', '"'],
            ['&amp;', '&lt;', '&gt;', '&quot;'],
            (string) ($value ?? '')
        );
    }

    private static function num($value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    private static function isoDate($d): string
    {
        if ($d instanceof \DateTimeInterface) {
            return $d->format('Y-m-d');
        }
        return date('Y-m-d', strtotime((string) $d));
    }

    private static function partyXml(string $tag, array $p): string
    {
        $taxScheme = ($p['uSistemuPdv'] ?? true) === false
            ? ''
            : "      <cac:PartyTaxScheme>\n"
                . '        <cbc:CompanyID>RS' . self::esc($p['pib']) . "</cbc:CompanyID>\n"
                . "        <cac:TaxScheme>\n          <cbc:ID>VAT</cbc:ID>\n        </cac:TaxScheme>\n"
                . "      </cac:PartyTaxScheme>\n";

        $contact = !empty($p['email'])
            ? "      <cac:Contact>\n        <cbc:ElectronicMail>" . self::esc($p['email']) . "</cbc:ElectronicMail>\n      </cac:Contact>\n"
            : '';

        // Matični broj je opcion (kod kupca PIB je dovoljan) — izostavi prazne elemente.
        $mb = trim((string) ($p['maticniBroj'] ?? ''));
        $partyIdent = $mb !== ''
            ? "      <cac:PartyIdentification>\n        <cbc:ID>" . self::esc($mb) . "</cbc:ID>\n      </cac:PartyIdentification>\n"
            : '';
        $companyId = $mb !== ''
            ? '        <cbc:CompanyID>' . self::esc($mb) . "</cbc:CompanyID>\n"
            : '';

        return "  <cac:{$tag}>\n"
            . "    <cac:Party>\n"
            . '      <cbc:EndpointID schemeID="9948">' . self::esc($p['pib']) . "</cbc:EndpointID>\n"
            . $partyIdent
            . "      <cac:PartyName>\n        <cbc:Name>" . self::esc($p['naziv']) . "</cbc:Name>\n      </cac:PartyName>\n"
            . "      <cac:PostalAddress>\n"
            . '        <cbc:StreetName>' . self::esc($p['adresa']) . "</cbc:StreetName>\n"
            . '        <cbc:CityName>' . self::esc($p['grad']) . "</cbc:CityName>\n"
            . '        <cbc:PostalZone>' . self::esc($p['postanskiBroj']) . "</cbc:PostalZone>\n"
            . "        <cac:Country>\n          <cbc:IdentificationCode>RS</cbc:IdentificationCode>\n        </cac:Country>\n"
            . "      </cac:PostalAddress>\n"
            . $taxScheme
            . "      <cac:PartyLegalEntity>\n"
            . '        <cbc:RegistrationName>' . self::esc($p['naziv']) . "</cbc:RegistrationName>\n"
            . $companyId
            . "      </cac:PartyLegalEntity>\n"
            . $contact
            . "    </cac:Party>\n"
            . "  </cac:{$tag}>";
    }

    /**
     * Gradi UBL 2.1 fakturu.
     * @param array $inv brojFakture, datumIzdavanja, datumValute, datumPrometa,
     *                   prodavac, kupac, racun, pozivNaBroj, stavke[], napomena?
     */
    public static function build(array $inv): string
    {
        $lines = [];
        $i = 0;
        foreach ($inv['stavke'] as $s) {
            $i++;
            $osnovica = (float) $s['kolicina'] * (float) $s['cena'];
            $lines[] = "  <cac:InvoiceLine>\n"
                . "    <cbc:ID>{$i}</cbc:ID>\n"
                . '    <cbc:InvoicedQuantity unitCode="' . self::esc($s['jedinicaMere'] ?? 'H87') . '">' . self::num($s['kolicina']) . "</cbc:InvoicedQuantity>\n"
                . '    <cbc:LineExtensionAmount currencyID="RSD">' . self::num($osnovica) . "</cbc:LineExtensionAmount>\n"
                . "    <cac:Item>\n"
                . '      <cbc:Name>' . self::esc($s['naziv']) . "</cbc:Name>\n"
                . "      <cac:ClassifiedTaxCategory>\n"
                . '        <cbc:ID>' . ((float) ($s['pdvStopa'] ?? 0) > 0 ? 'S' : 'O') . "</cbc:ID>\n"
                . '        <cbc:Percent>' . self::num($s['pdvStopa'] ?? 0) . "</cbc:Percent>\n"
                . "        <cac:TaxScheme>\n          <cbc:ID>VAT</cbc:ID>\n        </cac:TaxScheme>\n"
                . "      </cac:ClassifiedTaxCategory>\n"
                . "    </cac:Item>\n"
                . "    <cac:Price>\n"
                . '      <cbc:PriceAmount currencyID="RSD">' . self::num($s['cena']) . "</cbc:PriceAmount>\n"
                . "    </cac:Price>\n"
                . "  </cac:InvoiceLine>";
        }

        // Grupisanje po poreskoj stopi — EN 16931 traži jedan TaxSubtotal po kategoriji.
        $groups = [];
        foreach ($inv['stavke'] as $s) {
            $rate = (float) ($s['pdvStopa'] ?? 0);
            $osnovica = (float) $s['kolicina'] * (float) $s['cena'];
            $key = (string) $rate;
            if (!isset($groups[$key])) {
                $groups[$key] = ['osnovica' => 0.0, 'rate' => $rate];
            }
            $groups[$key]['osnovica'] += $osnovica;
        }

        $ukupnoOsnovica = 0.0;
        $ukupnoPdv = 0.0;
        $subtotals = [];
        foreach ($groups as $g) {
            $pdv = $g['osnovica'] * ($g['rate'] / 100);
            $ukupnoOsnovica += $g['osnovica'];
            $ukupnoPdv += $pdv;
            $exempt = $g['rate'] > 0
                ? ''
                : "\n        <cbc:TaxExemptionReasonCode>PDV-RS-33</cbc:TaxExemptionReasonCode>\n        <cbc:TaxExemptionReason>Nije u sistemu PDV-a</cbc:TaxExemptionReason>";
            $subtotals[] = "    <cac:TaxSubtotal>\n"
                . '      <cbc:TaxableAmount currencyID="RSD">' . self::num($g['osnovica']) . "</cbc:TaxableAmount>\n"
                . '      <cbc:TaxAmount currencyID="RSD">' . self::num($pdv) . "</cbc:TaxAmount>\n"
                . "      <cac:TaxCategory>\n"
                . '        <cbc:ID>' . ($g['rate'] > 0 ? 'S' : 'O') . "</cbc:ID>\n"
                . '        <cbc:Percent>' . self::num($g['rate']) . '</cbc:Percent>' . $exempt . "\n"
                . "        <cac:TaxScheme>\n          <cbc:ID>VAT</cbc:ID>\n        </cac:TaxScheme>\n"
                . "      </cac:TaxCategory>\n"
                . "    </cac:TaxSubtotal>";
        }

        $ukupno = $ukupnoOsnovica + $ukupnoPdv;
        $racun = preg_replace('/\D/', '', (string) $inv['racun']);
        $napomena = !empty($inv['napomena']) ? '  <cbc:Note>' . self::esc($inv['napomena']) . "</cbc:Note>\n" : '';

        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"' . "\n"
            . '         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"' . "\n"
            . '         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">' . "\n"
            . '  <cbc:CustomizationID>' . self::CUSTOMIZATION_ID . "</cbc:CustomizationID>\n"
            . '  <cbc:ID>' . self::esc($inv['brojFakture']) . "</cbc:ID>\n"
            . '  <cbc:IssueDate>' . self::isoDate($inv['datumIzdavanja']) . "</cbc:IssueDate>\n"
            . '  <cbc:DueDate>' . self::isoDate($inv['datumValute']) . "</cbc:DueDate>\n"
            . "  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n"
            . $napomena
            . "  <cbc:DocumentCurrencyCode>RSD</cbc:DocumentCurrencyCode>\n"
            . "  <cac:InvoicePeriod>\n    <cbc:EndDate>" . self::isoDate($inv['datumPrometa']) . "</cbc:EndDate>\n  </cac:InvoicePeriod>\n"
            . self::partyXml('AccountingSupplierParty', $inv['prodavac']) . "\n"
            . self::partyXml('AccountingCustomerParty', $inv['kupac']) . "\n"
            . "  <cac:PaymentMeans>\n"
            . "    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>\n"
            . '    <cbc:PaymentID>' . self::esc($inv['pozivNaBroj']) . "</cbc:PaymentID>\n"
            . "    <cac:PayeeFinancialAccount>\n      <cbc:ID>" . self::esc($racun) . "</cbc:ID>\n    </cac:PayeeFinancialAccount>\n"
            . "  </cac:PaymentMeans>\n"
            . "  <cac:TaxTotal>\n"
            . '    <cbc:TaxAmount currencyID="RSD">' . self::num($ukupnoPdv) . "</cbc:TaxAmount>\n"
            . implode("\n", $subtotals) . "\n"
            . "  </cac:TaxTotal>\n"
            . "  <cac:LegalMonetaryTotal>\n"
            . '    <cbc:LineExtensionAmount currencyID="RSD">' . self::num($ukupnoOsnovica) . "</cbc:LineExtensionAmount>\n"
            . '    <cbc:TaxExclusiveAmount currencyID="RSD">' . self::num($ukupnoOsnovica) . "</cbc:TaxExclusiveAmount>\n"
            . '    <cbc:TaxInclusiveAmount currencyID="RSD">' . self::num($ukupno) . "</cbc:TaxInclusiveAmount>\n"
            . '    <cbc:PayableAmount currencyID="RSD">' . self::num($ukupno) . "</cbc:PayableAmount>\n"
            . "  </cac:LegalMonetaryTotal>\n"
            . implode("\n", $lines) . "\n"
            . '</Invoice>';
    }

    /** Iznosi bez generisanja XML-a (za upis u bazu i IPS QR). */
    public static function calculateTotals(array $stavke): array
    {
        $osnovica = 0.0;
        $pdv = 0.0;
        foreach ($stavke as $s) {
            $o = (float) $s['kolicina'] * (float) $s['cena'];
            $osnovica += $o;
            $pdv += $o * ((float) ($s['pdvStopa'] ?? 0) / 100);
        }
        return [
            'osnovica' => round($osnovica, 2),
            'pdv'      => round($pdv, 2),
            'ukupno'   => round($osnovica + $pdv, 2),
        ];
    }
}
