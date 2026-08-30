<?php
/**
 * Uparivanje uplata sa bankovnog izvoda (camt.053 ISO 20022) sa fakturama.
 * Port iz infinityplay-billing/src/bank-reconciliation.js (SimpleXML umesto
 * fast-xml-parser).
 *
 * Ključno pravilo: uplata čiji se iznos NE poklapa sa fakturom se NE zatvara
 * automatski — ide na 'review' (ručni pregled). Match ide po OSNOVI poziva na
 * broj (model 97), pa je robustan na razne zapise sa izvoda.
 *
 * Ako banka daje svoj format umesto camt.053, menja se samo parseCamt053().
 */

namespace Billing;

require_once __DIR__ . '/PozivNaBroj.php';
require_once __DIR__ . '/Subscription.php';

final class BankReconciliation
{
    /** Tolerancija razlike iznosa (RSD) da se smatra tačnom uplatom. */
    private const AMOUNT_TOLERANCE = 1.0;

    public function __construct(private BillingRepo $repo, private $logger = null)
    {
    }

    /**
     * Parsira camt.053 XML i vraća listu priliv-transakcija (CRDT).
     * @return array[] [{import_ref, iznos, valuta, datum, poziv_na_broj, nalogodavac, ref, opis}]
     */
    public static function parseCamt053(string $xml): array
    {
        $prev = libxml_use_internal_errors(true);
        $sx = simplexml_load_string($xml);
        libxml_use_internal_errors($prev);
        if ($sx === false) {
            throw new \InvalidArgumentException('Neispravan XML izvoda.');
        }
        // Skloni namespace prefikse — registruj prazan default NS na svakom nivou.
        $doc = self::stripNs($sx);

        $transactions = [];
        $statements = $doc->BkToCstmrStmt->Stmt ?? null;
        if ($statements === null) {
            return $transactions;
        }
        foreach ($statements as $stmt) {
            foreach (($stmt->Ntry ?? []) as $entry) {
                if ((string) $entry->CdtDbtInd !== 'CRDT') {
                    continue; // samo prilivi
                }
                $tx = $entry->NtryDtls->TxDtls ?? null;
                if ($tx instanceof \SimpleXMLElement && $tx->count() === 0 && isset($tx[0])) {
                    $tx = $tx[0];
                }

                $amt = $entry->Amt;
                $iznos = (float) ((string) $amt);
                $valuta = (string) ($amt['Ccy'] ?? 'RSD');
                $datum = (string) ($entry->BookgDt->Dt ?? $entry->ValDt->Dt ?? '');

                $pnb = '';
                if ($tx) {
                    $pnb = (string) ($tx->RmtInf->Strd->CdtrRefInf->Ref
                        ?? $tx->RmtInf->Ustrd
                        ?? '');
                }
                if ($pnb === '') {
                    $pnb = (string) ($entry->AcctSvcrRef ?? '');
                }

                $ref = (string) ($entry->AcctSvcrRef ?? ($tx->Refs->EndToEndId ?? ''));
                $nalogodavac = $tx ? (string) ($tx->RltdPties->Dbtr->Nm ?? '') : '';
                $opis = $tx ? (string) ($tx->RmtInf->Ustrd ?? '') : '';

                // import_ref: stabilan jedinstveni ključ stavke (za dedup uvoza).
                $importRef = $ref !== '' ? $ref : sha1($datum . '|' . $iznos . '|' . $pnb . '|' . $nalogodavac);

                $transactions[] = [
                    'import_ref'    => $importRef,
                    'iznos'         => $iznos,
                    'valuta'        => $valuta,
                    'datum'         => $datum ?: date('Y-m-d'),
                    'poziv_na_broj' => $pnb,
                    'nalogodavac'   => $nalogodavac,
                    'ref'           => $ref,
                    'opis'          => $opis,
                ];
            }
        }
        return $transactions;
    }

    /**
     * Uparuje transakcije sa fakturama i zatvara ih. Idempotentno preko
     * import_ref (dupli uvoz istog izvoda ne radi ništa dvaput).
     *
     * @param array[] $transactions rezultat parseCamt053
     * @param ?callable $onPaid ($invoice, $tx) — vrati nalog u pun režim
     * @return array{matched:int, partial:int, unmatched:int, details:array}
     */
    public function reconcile(array $transactions, ?callable $onPaid = null): array
    {
        $res = ['matched' => 0, 'partial' => 0, 'unmatched' => 0, 'details' => []];

        foreach ($transactions as $tx) {
            // Zabeleži stavku izvoda (dedup). Ako već postoji, preskoči obradu.
            $isNew = $this->repo->insertBankTransaction([
                'import_ref'    => $tx['import_ref'],
                'datum'         => $tx['datum'],
                'iznos'         => $tx['iznos'],
                'poziv_na_broj' => $tx['poziv_na_broj'],
                'nalogodavac'   => $tx['nalogodavac'] ?? null,
                'raw'           => $tx,
                'status'        => 'unmatched',
            ]);
            if (!$isNew) {
                continue; // već uvezeno ranije
            }

            $raw = preg_replace('/\D/', '', (string) ($tx['poziv_na_broj'] ?? ''));

            // Izvodi variraju: poziv na broj može biti "KK-baza" ili sa vodećim
            // modelom "97KKbaza" (kako ga upisujemo u IPS QR). Probamo obe
            // interpretacije i uzimamo osnovu one koja je ispravna po modelu 97.
            $bases = [];
            if ($raw !== '' && PozivNaBroj::isValid($raw)) {
                $bases[] = PozivNaBroj::extractBase($raw);
            }
            if (strlen($raw) > 2 && substr($raw, 0, 2) === '97' && PozivNaBroj::isValid($raw, true)) {
                $bases[] = PozivNaBroj::extractBase(substr($raw, 2));
            }
            $bases = array_values(array_unique($bases));

            if (empty($bases)) {
                $this->repo->updateBankTransactionStatus($tx['import_ref'], 'unmatched');
                $res['unmatched']++;
                $res['details'][] = ['ref' => $tx['import_ref'], 'razlog' => 'nema ispravan poziv na broj'];
                continue;
            }

            $invoice = null;
            foreach ($bases as $base) {
                $invoice = $this->repo->findInvoiceByPozivNaBrojBase($base);
                if ($invoice) {
                    break;
                }
            }
            if (!$invoice) {
                $this->repo->updateBankTransactionStatus($tx['import_ref'], 'unmatched');
                $res['unmatched']++;
                $res['details'][] = ['ref' => $tx['import_ref'], 'razlog' => 'faktura nije pronađena'];
                continue;
            }
            if ($invoice['status'] === 'paid') {
                $this->repo->updateBankTransactionStatus($tx['import_ref'], 'matched', (int) $invoice['id']);
                $res['unmatched']++;
                $res['details'][] = ['ref' => $tx['import_ref'], 'razlog' => 'faktura već zatvorena'];
                continue;
            }

            $razlika = abs((float) $invoice['ukupno'] - (float) $tx['iznos']);
            if ($razlika > self::AMOUNT_TOLERANCE) {
                // Nepoklapanje iznosa -> NE zatvaraj, izlistaj za ručni pregled.
                $this->repo->updateBankTransactionStatus($tx['import_ref'], 'review', (int) $invoice['id']);
                $this->repo->logEvent($invoice['subscription_id'], (int) $invoice['id'], 'payment_amount_mismatch',
                    'iznos se ne poklapa — ručni pregled',
                    ['ocekivano' => $invoice['ukupno'], 'uplaceno' => $tx['iznos']]);
                $res['partial']++;
                $res['details'][] = ['ref' => $tx['import_ref'], 'invoice' => $invoice['broj_fakture'], 'ocekivano' => $invoice['ukupno'], 'uplaceno' => $tx['iznos']];
                continue;
            }

            // Tačna uplata -> zatvori fakturu + pretplata u active (kroz state machine).
            $this->repo->markInvoicePaid((int) $invoice['id'], $tx['datum'], $tx['iznos'], $tx['ref'] ?? $tx['import_ref']);
            $this->repo->updateBankTransactionStatus($tx['import_ref'], 'matched', (int) $invoice['id']);
            try {
                $this->repo->applyEvent($invoice['subscription_id'], Subscription::EV_PAYMENT_MATCHED);
            } catch (\Throwable $e) {
                // Pretplata je možda već active (dupla uplata) — nije greška uparivanja.
                $this->log("uplata uparena ali prelaz preskočen: " . $e->getMessage());
            }
            $this->repo->logEvent($invoice['subscription_id'], (int) $invoice['id'], 'payment_matched',
                'uplata uparena sa izvoda', ['iznos' => $tx['iznos'], 'ref' => $tx['ref'] ?? null]);

            if ($onPaid) {
                $onPaid($invoice, $tx);
            }
            $res['matched']++;
            $res['details'][] = ['ref' => $tx['import_ref'], 'invoice' => $invoice['broj_fakture'], 'iznos' => $tx['iznos']];
            $this->log("Zatvorena faktura {$invoice['broj_fakture']} ({$tx['iznos']} RSD).");
        }

        $this->log("Upareno {$res['matched']}, delimično {$res['partial']}, neupareno {$res['unmatched']}.");
        return $res;
    }

    /** Vrati SimpleXML bez namespace prefiksa (camt koristi default NS). */
    private static function stripNs(\SimpleXMLElement $xml): \SimpleXMLElement
    {
        $namespaces = $xml->getDocNamespaces(true);
        if (empty($namespaces)) {
            return $xml;
        }
        // Reparsuj sa uklonjenim xmlns atributom -> pristup bez prefiksa/registracije.
        $raw = $xml->asXML();
        $raw = preg_replace('/\sxmlns(:\w+)?="[^"]*"/', '', $raw);
        return simplexml_load_string($raw);
    }

    private function log(string $msg): void
    {
        if ($this->logger) {
            ($this->logger)($msg);
        } else {
            error_log('[reconciliation] ' . $msg);
        }
    }
}
