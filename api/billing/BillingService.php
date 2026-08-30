<?php
/**
 * Orkestracija: pretplata -> faktura -> SEF -> mejl. Ekvivalent
 * infinityplay-billing/src/invoice-service.js, prilagođen PHP-u/MariaDB-u.
 *
 * Ključne garancije:
 *  - createInvoiceForSubscription je idempotentan (findInvoiceByPeriod)
 *  - issueInvoice je idempotentan PO KANALU (SEF vs mejl), pa retry posle
 *    pada mejla ne šalje ponovo na SEF, i obrnuto
 *  - SEF pad NE ruši proces: korisnik svejedno dobija mejl i pristup
 *  - strani klijent (drzava != RS) i klijent koji nije na SEF-u: samo mejl
 */

namespace Billing;

require_once __DIR__ . '/PozivNaBroj.php';
require_once __DIR__ . '/Ubl.php';
require_once __DIR__ . '/IpsQr.php';
require_once __DIR__ . '/InvoiceTemplate.php';
require_once __DIR__ . '/InvoicePdf.php';
require_once __DIR__ . '/Sef.php';
require_once __DIR__ . '/Plans.php';

final class BillingService
{
    /** @var callable(string $to, string $subject, string $html, array $attachments):bool */
    private $sendEmail;

    /**
     * @param BillingRepo $repo
     * @param array       $company naziv,pib,maticniBroj,adresa,grad,postanskiBroj,email,telefon,racun,uSistemuPdv
     * @param ?SefSender   $sef     null = SEF nije podešen (samo mejl)
     * @param callable    $sendEmail ($to,$subject,$html) => bool
     * @param int         $rokDana rok plaćanja (dana od izdavanja)
     */
    public function __construct(
        private BillingRepo $repo,
        private array $company,
        private ?SefSender $sef,
        callable $sendEmail,
        private int $rokDana = 5,
        private $logger = null,
        private int $sefAttempts = 4,
        private int $sefDelayMs = 2000
    ) {
        $this->sendEmail = $sendEmail;
    }

    /** Period za koji se fakturiše (ključ, datumi). */
    public static function buildPeriod(\DateTimeImmutable $date, string $ciklus, int $rokDana): array
    {
        $due = $date->modify("+{$rokDana} days");
        $y = $date->format('Y');
        $m = $date->format('m');
        if ($ciklus === 'godisnje') {
            $key = "{$y}-G-{$m}";
            $label = $date->format('d.m.Y.') . ' – ' . $date->modify('+1 year')->format('d.m.Y.');
        } else {
            $key = "{$y}-{$m}";
            $label = $date->format('m/Y');
        }
        return [
            'key'         => $key,
            'label'       => $label,
            'issueDate'   => $date->format('Y-m-d'),
            'dueDate'     => $due->format('Y-m-d'),
            'serviceDate' => $date->format('Y-m-d'),
        ];
    }

    /**
     * Kreira fakturu za pretplatu. Idempotentno: ako za taj period već postoji,
     * vraća postojeću. Vraća id fakture.
     */
    public function createInvoiceForSubscription(array $subscription, array $period): int
    {
        $existing = $this->repo->findInvoiceByPeriod($subscription['id'], $period['key']);
        if ($existing) {
            $this->log("Faktura za {$subscription['id']}/{$period['key']} već postoji.");
            return (int) $existing['id'];
        }

        $year = (int) date('Y', strtotime($period['issueDate']));
        $seq = $this->repo->nextInvoiceSequence($year);
        $pnb = PozivNaBroj::build($seq, $year);

        $prodavacUPdv = !empty($this->company['uSistemuPdv']);
        $obracun = Plans::obracun(
            $subscription['plan'],
            $subscription['ciklus'],
            (int) $subscription['broj_lokacija'],
            $prodavacUPdv
        );

        try {
            return $this->repo->createInvoice([
                'subscription_id'   => $subscription['id'],
                'client_id'         => $subscription['client_id'],
                'broj_fakture'      => "{$year}-" . str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                'period_key'        => $period['key'],
                'datum_izdavanja'   => $period['issueDate'],
                'datum_valute'      => $period['dueDate'],
                'datum_prometa'     => $period['serviceDate'],
                'poziv_na_broj'     => $pnb['formatted'],
                'poziv_na_broj_ips' => $pnb['ips'],
                'osnovica'          => $obracun['osnovica'],
                'pdv'               => $obracun['pdv'],
                'ukupno'            => $obracun['ukupno'],
                'valuta'            => $subscription['currency'] ?? 'RSD',
                'stavke'            => $obracun['stavke'],
                'status'            => 'draft',
            ]);
        } catch (\PDOException $e) {
            // Trka sa duplim cronom: neko je upravo kreirao za isti period.
            if ($e->getCode() === '23000') {
                $existing = $this->repo->findInvoiceByPeriod($subscription['id'], $period['key']);
                if ($existing) {
                    return (int) $existing['id'];
                }
            }
            throw $e;
        }
    }

    /** Šalje fakturu na SEF (ako je primenljivo) i mejlom. Idempotentno po kanalu. */
    public function issueInvoice(int $invoiceId): array
    {
        $invoice = $this->repo->getInvoice($invoiceId);
        if (!$invoice) {
            throw new \RuntimeException("Faktura ne postoji: {$invoiceId}");
        }
        $client = $this->repo->getClient($invoice['client_id']);
        if (!$client) {
            throw new \RuntimeException("Klijent ne postoji za fakturu {$invoiceId}");
        }

        $domaci = ($client['drzava'] ?? 'RS') === 'RS';

        // ── SEF kanal (samo domaći + registrovan + ključ podešen + još ne poslato) ──
        $sefTriedNow = false;
        $shouldSef = $domaci
            && !empty($client['sef_registered'])
            && $this->sef !== null
            && empty($invoice['sef_invoice_id'])
            && $invoice['status'] !== 'sef_failed';

        if ($domaci && empty($invoice['ubl_xml'])) {
            $ubl = Ubl::build($this->buildUblInput($invoice, $client));
            $this->repo->saveInvoiceXml($invoiceId, $ubl);
            $invoice['ubl_xml'] = $ubl;
        }

        if ($shouldSef) {
            $sefTriedNow = true;
            try {
                $resp = Sef::sendWithRetry($this->sef, $invoiceId, $invoice['ubl_xml'], 0, $this->sefAttempts, $this->sefDelayMs);
                $sefInvoiceId = is_array($resp) ? ($resp['InvoiceId'] ?? $resp['invoiceId'] ?? null) : null;
                $sefStatus = is_array($resp) ? ($resp['Status'] ?? $resp['status'] ?? null) : null;
                $this->repo->markInvoiceSent($invoiceId, $sefInvoiceId ? (string) $sefInvoiceId : null, $sefStatus ? (string) $sefStatus : null, $resp);
                $this->repo->logEvent($invoice['subscription_id'], $invoiceId, 'sef_sent', 'faktura poslata na SEF', ['sef_invoice_id' => $sefInvoiceId]);
            } catch (SefClientError $e) {
                // SEF odbio (4xx). Ne rušimo proces — mejl svejedno ide.
                $this->repo->markInvoiceSefFailed($invoiceId, $e->body);
                $this->repo->logEvent($invoice['subscription_id'], $invoiceId, 'sef_rejected', 'SEF odbio fakturu', ['status' => $e->statusCode, 'body' => $e->body]);
                if (self::looksLikeNotRegistered($e->body)) {
                    $this->repo->setClientSefRegistered($client['id'], false);
                    $this->repo->logEvent($invoice['subscription_id'], $invoiceId, 'sef_client_unregistered', 'Primalac nije registrovan na SEF — ubuduće samo mejl');
                }
            } catch (\RuntimeException $e) {
                // Mreža/5xx iscrpljeni. Zabeleži, mejl ide, worker može kasnije opet.
                $this->repo->markInvoiceSefFailed($invoiceId, ['error' => $e->getMessage()]);
                $this->repo->logEvent($invoice['subscription_id'], $invoiceId, 'sef_unreachable', 'SEF nedostupan posle retry-ja', ['error' => $e->getMessage()]);
            }
        }

        // ── Mejl kanal (uvek, bez obzira na SEF; idempotentno) ──────────────
        $freshBefore = $this->repo->getInvoice($invoiceId);
        if (empty($freshBefore['email_sent_at'])) {
            $qr = IpsQr::pngDataUrl([
                'racun'       => $this->company['racun'],
                'primalac'    => "{$this->company['naziv']}, {$this->company['adresa']}, {$this->company['grad']}",
                'iznos'       => $invoice['ukupno'],
                'svrha'       => "Pretplata {$invoice['period_key']}",
                'pozivNaBroj' => $invoice['poziv_na_broj_ips'],
                'platilac'    => $client['naziv'],
            ]);
            $html = InvoiceTemplate::render($invoice, $client, $this->company, $qr);

            // PDF prilog (Dompdf). Ako generisanje pukne, ne rušimo slanje — mejl
            // ide bez priloga (HTML u telu i dalje sadrži sve).
            $attachments = [];
            try {
                $pdf = InvoicePdf::render($invoice, $client, $this->company, $qr);
                $attachments[] = [
                    'filename' => "Faktura-{$invoice['broj_fakture']}.pdf",
                    'content'  => $pdf,
                    'mime'     => 'application/pdf',
                ];
            } catch (\Throwable $e) {
                $this->log('PDF generisanje nije uspelo za ' . $invoice['broj_fakture'] . ': ' . $e->getMessage());
            }

            $ok = ($this->sendEmail)(
                $client['email'],
                "Faktura {$invoice['broj_fakture']} — {$this->company['naziv']}",
                $html,
                $attachments
            );
            if (!$ok) {
                throw new \RuntimeException("Slanje mejla nije uspelo za fakturu {$invoice['broj_fakture']}");
            }
            $this->repo->markInvoiceEmailed($invoiceId);
            $this->repo->logEvent($invoice['subscription_id'], $invoiceId, 'invoice_emailed', 'faktura poslata na mejl', ['to' => $client['email']]);
        }

        // Status: ako SEF nije ni pokušan/uspeo a mejl je otišao -> 'sent'
        // (dostavljeno, čeka uplatu). sef_failed ostaje sef_failed.
        $fresh = $this->repo->getInvoice($invoiceId);
        if ($fresh['status'] === 'draft') {
            $this->repo->updateInvoiceStatus($invoiceId, 'sent');
            $fresh['status'] = 'sent';
        }

        $this->log("Izdata faktura {$invoice['broj_fakture']} klijentu {$client['naziv']} (SEF: " . ($sefTriedNow ? 'pokušan' : 'preskočen') . ').');
        return $fresh;
    }

    private function buildUblInput(array $invoice, array $client): array
    {
        $stavke = is_string($invoice['stavke']) ? json_decode($invoice['stavke'], true) : $invoice['stavke'];
        return [
            'brojFakture'    => $invoice['broj_fakture'],
            'datumIzdavanja' => $invoice['datum_izdavanja'],
            'datumValute'    => $invoice['datum_valute'],
            'datumPrometa'   => $invoice['datum_prometa'],
            'prodavac'       => [
                'naziv'        => $this->company['naziv'],
                'pib'          => $this->company['pib'],
                'maticniBroj'  => $this->company['maticniBroj'],
                'adresa'       => $this->company['adresa'],
                'grad'         => $this->company['grad'],
                'postanskiBroj'=> $this->company['postanskiBroj'],
                'email'        => $this->company['email'] ?? null,
                'uSistemuPdv'  => !empty($this->company['uSistemuPdv']),
            ],
            'kupac'          => [
                'naziv'        => $client['naziv'],
                'pib'          => $client['pib'],
                'maticniBroj'  => $client['maticni_broj'],
                'adresa'       => $client['adresa'],
                'grad'         => $client['grad'],
                'postanskiBroj'=> $client['postanski_broj'],
                'email'        => $client['email'],
                'uSistemuPdv'  => !empty($client['u_sistemu_pdv']),
            ],
            'racun'          => $this->company['racun'],
            'pozivNaBroj'    => $invoice['poziv_na_broj'],
            'stavke'         => $stavke,
        ];
    }

    /** Heuristika: da li SEF odgovor znači „primalac nije registrovan". */
    public static function looksLikeNotRegistered($body): bool
    {
        $text = is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_UNICODE);
        $text = mb_strtolower((string) $text);
        foreach (['not registered', 'nije registrovan', 'not found', 'recipient', 'primalac', 'buyer is not'] as $needle) {
            if (mb_strpos($text, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    private function log(string $msg): void
    {
        if ($this->logger) {
            ($this->logger)($msg);
        }
    }
}
