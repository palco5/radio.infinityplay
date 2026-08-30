<?php
/**
 * Klijent za SEF (Sistem elektronskih faktura) Public API. Port iz
 * infinityplay-billing/src/sef.js.
 *
 * Demo:       https://demoefaktura.mfin.gov.rs/api/publicApi
 * Produkcija: https://efaktura.mfin.gov.rs/api/publicApi
 *
 * VAŽNO: API ključ važi SAMO za okruženje na kom je generisan.
 * requestId MORA biti stabilan po fakturi (id reda iz baze) — zaštita od duplog
 * slanja: isti requestId ne pravi novu fakturu na SEF-u.
 */

namespace Billing;

/** Bacamo je kad SEF vrati 4xx (greška u podacima) — retry nema smisla. */
class SefClientError extends \RuntimeException
{
    public int $statusCode = 0;
    /** @var mixed */
    public $body = null;
}

/** Minimalni interfejs slanja — omogućava lažni SEF u testovima. */
interface SefSender
{
    /** @return mixed */
    public function sendSalesInvoiceUbl(int $requestId, string $ublXml, int $sendToCir = 0);
}

final class Sef implements SefSender
{
    private const BASES = [
        'demo'       => 'https://demoefaktura.mfin.gov.rs/api/publicApi',
        'production' => 'https://efaktura.mfin.gov.rs/api/publicApi',
    ];

    private string $apiKey;
    private string $baseUrl;
    private int $timeoutMs;

    public function __construct(string $apiKey, string $environment = 'demo', int $timeoutMs = 30000)
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException('SEF_API_KEY nije postavljen.');
        }
        if (!isset(self::BASES[$environment])) {
            throw new \InvalidArgumentException("Nepoznato SEF okruženje: {$environment}");
        }
        $this->apiKey = $apiKey;
        $this->baseUrl = self::BASES[$environment];
        $this->timeoutMs = $timeoutMs;
    }

    /**
     * Šalje izlaznu fakturu kao UBL 2.1 XML.
     * @return mixed dekodiran JSON odgovor (ili sirov tekst)
     * @throws SefClientError na 4xx, \RuntimeException na mrežnu/5xx grešku
     */
    public function sendSalesInvoiceUbl(int $requestId, string $ublXml, int $sendToCir = 0)
    {
        if ($requestId <= 0) {
            throw new \InvalidArgumentException('requestId je obavezan.');
        }
        $url = $this->baseUrl . '/sales-invoice/ubl?' . http_build_query([
            'requestId' => $requestId,
            'sendToCir' => $sendToCir,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $ublXml,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS     => $this->timeoutMs,
            CURLOPT_HTTPHEADER     => [
                'ApiKey: ' . $this->apiKey,
                'Content-Type: application/xml',
                'Accept: application/json',
            ],
        ]);

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($errno !== 0) {
            // Mrežna greška — tretira se kao privremena (retry je dozvoljen).
            throw new \RuntimeException("SEF mrežna greška: {$curlErr}");
        }

        $parsed = $raw;
        $decoded = json_decode((string) $raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $parsed = $decoded;
        }

        if ($status >= 400) {
            $err = new SefClientError("SEF POST /sales-invoice/ubl -> {$status}");
            $err->statusCode = $status;
            $err->body = $parsed;
            throw $err;
        }
        return $parsed;
    }

    /** Status i detalji izlazne fakture. */
    public function getSalesInvoice(int $invoiceId)
    {
        $url = $this->baseUrl . '/sales-invoice?' . http_build_query(['invoiceId' => $invoiceId]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS     => $this->timeoutMs,
            CURLOPT_HTTPHEADER     => ['ApiKey: ' . $this->apiKey, 'Accept: application/json'],
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $decoded = json_decode((string) $raw, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
    }

    /**
     * Slanje sa ponavljanjem. Mrežnu/5xx grešku ne tretiraj kao neuspelo
     * fakturisanje — ponovi sa ISTIM requestId. 4xx (osim 429) se ne ponavlja.
     */
    public static function sendWithRetry(SefSender $client, int $requestId, string $ublXml, int $sendToCir = 0, int $attempts = 4, int $baseDelayMs = 2000)
    {
        $lastError = null;
        for ($i = 0; $i < $attempts; $i++) {
            try {
                return $client->sendSalesInvoiceUbl($requestId, $ublXml, $sendToCir);
            } catch (SefClientError $e) {
                // 4xx osim 429 = greška u podacima -> ponavljanje neće pomoći.
                if ($e->statusCode !== 429) {
                    throw $e;
                }
                $lastError = $e;
            } catch (\RuntimeException $e) {
                $lastError = $e; // mrežna/5xx -> retry
            }
            if ($i < $attempts - 1) {
                usleep($baseDelayMs * (2 ** $i) * 1000);
            }
        }
        throw $lastError;
    }
}
