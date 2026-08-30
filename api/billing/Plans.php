<?php
/**
 * Server-side definicije paketa i cena — AUTORITATIVNO za obračun fakture.
 * Cena se NIKAD ne uzima od klijenta; klijent šalje samo izbor paketa/ciklusa/
 * broja lokacija, server računa iznos odavde. Ogledalo src/lib/plans.ts —
 * drži ih usklađenim (naziv, cenaMesecnoRsd).
 */

namespace Billing;

final class Plans
{
    public const GODISNJE_GRATIS_MESECI = 2;
    public const PDV_STOPA = 20;

    /** id => [naziv, cenaMesecnoRsd (po lokaciji, bez PDV-a)] */
    private const PLANS = [
        // RSD cene po lokaciji, BEZ PDV-a. Host je godišnji paket (annualOnly).
        // godisnjeRsd je eksplicitno (za mesečne = mesecno×10; za host = 195€×118).
        'basic-radio'   => ['naziv' => 'Basic Radio',   'annualOnly' => false, 'mesecnoRsd' => 1770,  'godisnjeRsd' => 17700],
        'branded-radio' => ['naziv' => 'Branded Radio', 'annualOnly' => false, 'mesecnoRsd' => 4130,  'godisnjeRsd' => 41300],
        'host-radio'    => ['naziv' => 'Host Radio',    'annualOnly' => true,  'mesecnoRsd' => null,  'godisnjeRsd' => 23010],
    ];

    public static function exists(string $id): bool
    {
        return isset(self::PLANS[$id]);
    }

    public static function naziv(string $id): string
    {
        return self::PLANS[$id]['naziv'] ?? $id;
    }

    public static function isAnnualOnly(string $id): bool
    {
        return (bool) (self::PLANS[$id]['annualOnly'] ?? false);
    }

    /** Efektivni ciklus: annualOnly plan je uvek godišnji. */
    public static function effectiveCiklus(string $id, string $ciklus): string
    {
        return self::isAnnualOnly($id) ? 'godisnje' : $ciklus;
    }

    /** Cena po lokaciji (RSD, bez PDV) za dati ciklus. */
    public static function cenaPoLokaciji(string $id, string $ciklus): float
    {
        $eff = self::effectiveCiklus($id, $ciklus);
        $p = self::PLANS[$id] ?? [];
        if ($eff === 'godisnje') {
            return (float) ($p['godisnjeRsd'] ?? 0);
        }
        return (float) ($p['mesecnoRsd'] ?? $p['godisnjeRsd'] ?? 0);
    }

    /**
     * Obračun stavki i iznosa za fakturu.
     * @return array{cena_po_lokaciji:float, osnovica:float, pdv:float, ukupno:float, stavke:array}
     */
    public static function obracun(string $id, string $ciklus, int $brojLokacija, bool $prodavacUPdv): array
    {
        $ciklus    = self::effectiveCiklus($id, $ciklus);
        $cenaPoLok = self::cenaPoLokaciji($id, $ciklus);
        $osnovica  = round($cenaPoLok * $brojLokacija, 2);
        $pdvStopa  = $prodavacUPdv ? self::PDV_STOPA : 0;
        $pdv       = round($osnovica * $pdvStopa / 100, 2);
        $ukupno    = round($osnovica + $pdv, 2);

        $opisCiklus = $ciklus === 'godisnje' ? 'godišnja pretplata' : 'mesečna pretplata';
        $stavke = [[
            'naziv'       => self::naziv($id) . " — {$opisCiklus}, {$brojLokacija} lok.",
            'kolicina'    => $brojLokacija,
            'jedinicaMere'=> 'H87',
            'cena'        => $cenaPoLok,
            'pdvStopa'    => $pdvStopa,
        ]];

        return [
            'cena_po_lokaciji' => $cenaPoLok,
            'osnovica'         => $osnovica,
            'pdv'              => $pdv,
            'ukupno'           => $ukupno,
            'stavke'           => $stavke,
        ];
    }
}
