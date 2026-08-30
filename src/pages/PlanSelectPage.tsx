import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, Crown, Zap } from 'lucide-react';
import { PLANS, getPlan, cenaEur, eur, effectiveCiklus, type Ciklus, GODISNJE_GRATIS_MESECI } from '../lib/plans';

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  'basic-radio': Sparkles,
  'branded-radio': Crown,
  'host-radio': Zap,
};

/**
 * Stranica 1 — izbor paketa (i ciklusa). Odavde se, na "Nastavi ka plaćanju",
 * ide na /checkout?plan=…&ciklus=… gde se stvarno plaća.
 */
export default function PlanSelectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [ciklus, setCiklus] = useState<Ciklus>((searchParams.get('ciklus') as Ciklus) || 'godisnje');
  const [selectedId, setSelectedId] = useState(getPlan(searchParams.get('plan')).id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const proceed = () => {
    const plan = getPlan(selectedId);
    navigate(`/checkout?plan=${selectedId}&ciklus=${effectiveCiklus(plan, ciklus)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 pt-24 md:pt-28 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Zaglavlje */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            Izaberite paket
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Prvo izaberite plan, zatim način plaćanja — karticom ili po fakturi.
          </p>
        </div>

        {/* Mesečno / Godišnje prekidač */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 bg-white dark:bg-infinity-dark-800 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setCiklus('mesecno')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                ciklus === 'mesecno'
                  ? 'bg-gradient-infinity text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-infinity-dark-700'
              }`}
            >
              Mesečno
            </button>
            <button
              type="button"
              onClick={() => setCiklus('godisnje')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                ciklus === 'godisnje'
                  ? 'bg-gradient-infinity text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-infinity-dark-700'
              }`}
            >
              Godišnje
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${ciklus === 'godisnje' ? 'bg-white/20' : 'bg-infinity-green-100 text-infinity-green-700'}`}>
                {GODISNJE_GRATIS_MESECI} meseca gratis
              </span>
            </button>
          </div>
        </div>

        {/* Kartice paketa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] ?? Sparkles;
            const active = plan.id === selectedId;
            const effCiklus = effectiveCiklus(plan, ciklus);
            const cena = cenaEur(plan, ciklus);
            const popular = plan.id === 'branded-radio';
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className={`relative text-left rounded-3xl p-6 transition-all bg-white dark:bg-infinity-dark-800 ${
                  active
                    ? 'ring-2 ring-infinity-green-500 shadow-xl scale-[1.02]'
                    : 'ring-1 ring-gray-200 dark:ring-infinity-dark-700 hover:ring-gray-300 hover:shadow-lg'
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-6 bg-gradient-infinity text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow">
                    Najpopularniji
                  </span>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-infinity-green-50 dark:bg-infinity-green-900/30 flex items-center justify-center">
                    <Icon className="text-infinity-green-600" size={24} />
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      active ? 'bg-infinity-green-500 border-infinity-green-500' : 'border-gray-300 dark:border-infinity-dark-600'
                    }`}
                  >
                    {active && <Check size={14} className="text-white" />}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <div className="mt-2 mb-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{eur(cena)}</span>
                  <span className="text-gray-400 text-sm">/ {effCiklus === 'godisnje' ? 'godišnje' : 'mesečno'}</span>
                </div>
                <p className="mb-4 h-4 text-xs text-infinity-green-600 font-medium">
                  {plan.annualOnly ? 'Dostupno samo godišnje' : ''}
                </p>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check size={16} className="text-infinity-green-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Nastavak */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={proceed}
            className="inline-flex items-center gap-2 bg-gradient-infinity text-white font-bold px-8 py-4 rounded-2xl hover:shadow-glow-green hover:scale-[1.02] transition-all"
          >
            Nastavi ka plaćanju
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
