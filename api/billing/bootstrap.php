<?php
/**
 * Sklapa BillingService iz konfiguracije (config.php konstante + getDB()).
 * Zovu ga worker i cron. SEF se uključuje samo ako je SEF_API_KEY podešen —
 * u suprotnom fakture idu samo mejlom (bezbedan podrazumevani režim).
 */

require_once __DIR__ . '/BillingRepo.php';
require_once __DIR__ . '/BillingService.php';
require_once __DIR__ . '/Sef.php';

/** @return array{repo: \Billing\BillingRepo, service: \Billing\BillingService} */
function makeBillingService(): array
{
    $db = getDB();
    $repo = new \Billing\BillingRepo($db);

    $company = [
        'naziv'         => COMPANY_NAZIV,
        'pib'           => COMPANY_PIB,
        'maticniBroj'   => COMPANY_MB,
        'adresa'        => COMPANY_ADRESA,
        'grad'          => COMPANY_GRAD,
        'postanskiBroj' => COMPANY_PTT,
        'email'         => COMPANY_EMAIL,
        'telefon'       => COMPANY_TELEFON,
        'racun'         => COMPANY_RACUN,
        'uSistemuPdv'   => (bool) COMPANY_U_SISTEMU_PDV,
    ];

    $sef = null;
    if (defined('SEF_API_KEY') && SEF_API_KEY !== '') {
        $sef = new \Billing\Sef(SEF_API_KEY, SEF_ENVIRONMENT);
    }

    // Mejl preko postojećeg SMTP slanja (Loopia). sendAppMail vraća bool.
    // Dry-run (ne šalje stvarno) je podrazumevan lokalno; env BILLING_SEND_REAL=1
    // ga forsira na pravo slanje za taj jedan pokret (npr. `npm run worker:mail`).
    $sendEmail = function (string $to, string $subject, string $html, array $attachments = []): bool {
        $dryrun = defined('BILLING_EMAIL_DRYRUN') && BILLING_EMAIL_DRYRUN;
        if (getenv('BILLING_SEND_REAL') === '1') {
            $dryrun = false;
        }
        if ($dryrun) {
            $att = $attachments ? ' (+' . count($attachments) . ' prilog)' : '';
            error_log("[billing] DRYRUN mejl -> {$to}: {$subject}{$att}");
            return true;
        }
        if (function_exists('sendAppMail')) {
            return (bool) sendAppMail($to, $subject, $html, $attachments);
        }
        error_log("[billing] sendAppMail nedostupan; mejl za {$to} nije poslat");
        return false;
    };

    $service = new \Billing\BillingService(
        $repo,
        $company,
        $sef,
        $sendEmail,
        (int) (defined('BILLING_ROK_PLACANJA_DANA') ? BILLING_ROK_PLACANJA_DANA : 5),
        function (string $msg) { error_log('[billing] ' . $msg); }
    );

    return ['repo' => $repo, 'service' => $service];
}
