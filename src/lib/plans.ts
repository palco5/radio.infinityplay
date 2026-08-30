// Zajedničke definicije paketa — koriste ih /pretplata (izbor), /checkout (kartica)
// i /checkout/firma (faktura). Držimo na jednom mestu da se cene ne razilaze.
//
// Host Radio je GODIŠNJI paket (nema mesečnog plaćanja): annualOnly = true.
// RSD cene su po lokaciji, BEZ PDV-a (faktura dodaje 20%). Kurs u projektu ~118 RSD/€.

export type PlanId = 'basic-radio' | 'branded-radio' | 'host-radio';
export type Ciklus = 'mesecno' | 'godisnje';

export interface Plan {
  id: PlanId;
  name: string;
  annualOnly: boolean;
  eurMesecno: number | null;   // null kad plan nema mesečno (host)
  eurGodisnje: number;
  rsdMesecno: number | null;   // po lokaciji, bez PDV; null kad nema mesečno
  rsdGodisnje: number;         // po lokaciji, bez PDV
  features: string[];
}

// Godišnje = 2 meseca gratis (plaća se 10 meseci umesto 12) za mesečne pakete.
export const GODISNJE_GRATIS_MESECI = 2;
export const PDV_STOPA = 20;

// Kartični provajder (merchant of record) — na JEDNOM mestu. Pravne stranice i
// checkout tekst ga čitaju odavde, pa buduća promena ide u jednu liniju.
export const MERCHANT_OF_RECORD = {
  name: 'Polar',
  legal: 'Polar Software Inc.',
  url: 'https://polar.sh',
} as const;

export const PLANS: Plan[] = [
  {
    id: 'basic-radio',
    name: 'Basic Radio',
    annualOnly: false,
    eurMesecno: 15,
    eurGodisnje: 150,   // 15 × 10 (2 meseca gratis)
    rsdMesecno: 1770,
    rsdGodisnje: 17700, // 1770 × 10
    features: [
      'Pristup svim stanicama i žanrovima',
      'HD kvalitet zvuka, bez reklama',
      'Podrška putem emaila',
    ],
  },
  {
    id: 'branded-radio',
    name: 'Branded Radio',
    annualOnly: false,
    eurMesecno: 35,
    eurGodisnje: 350,   // 35 × 10
    rsdMesecno: 4130,
    rsdGodisnje: 41300, // 4130 × 10
    features: [
      'Sve iz Basic paketa',
      'Personalizovani stream sa vašim džinglovima',
      'Brendirana grafika i prioritetna podrška',
    ],
  },
  {
    id: 'host-radio',
    name: 'Host Radio',
    annualOnly: true,
    eurMesecno: null,   // samo godišnje
    eurGodisnje: 195,
    rsdMesecno: null,
    rsdGodisnje: 23010, // 195 × 118
    features: [
      'Sve iz Branded paketa',
      'Admin panel i kreiranje stanica',
      'Praćenje slušanosti u realnom vremenu',
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Efektivni ciklus: annualOnly plan uvek na godišnjem, bez obzira na izbor. */
export function effectiveCiklus(plan: Plan, ciklus: Ciklus): Ciklus {
  return plan.annualOnly ? 'godisnje' : ciklus;
}

/** Cena po lokaciji (RSD, bez PDV) za dati ciklus. */
export function cenaPoLokaciji(plan: Plan, ciklus: Ciklus): number {
  return effectiveCiklus(plan, ciklus) === 'godisnje'
    ? plan.rsdGodisnje
    : (plan.rsdMesecno ?? plan.rsdGodisnje);
}

/** EUR cena za karticu za dati ciklus. */
export function cenaEur(plan: Plan, ciklus: Ciklus): number {
  return effectiveCiklus(plan, ciklus) === 'godisnje'
    ? plan.eurGodisnje
    : (plan.eurMesecno ?? plan.eurGodisnje);
}

export function rsd(iznos: number): string {
  return iznos.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RSD';
}

export function eur(iznos: number): string {
  return `${iznos.toLocaleString('sr-RS')}€`;
}
