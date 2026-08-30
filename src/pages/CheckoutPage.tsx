import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPolarConfigured, createPolarCheckoutUrl } from '../lib/polar';
import { getPlan, cenaEur, eur, effectiveCiklus, MERCHANT_OF_RECORD, type Ciklus } from '../lib/plans';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Stranica 2 — plaćanje. Paket se bira na /pretplata; ovde se plaća.
 *   • DESNO (primarno): kartično plaćanje UGRAĐENO u stranicu (Polar iframe, bez
 *     modala). Dok Polar nije podešen — maketa forme.
 *   • LEVO (sekundarno): "Plaćate kao firma?" + dugme na /checkout/firma.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();

  const plan = getPlan(searchParams.get('plan'));
  const ciklus: Ciklus = (searchParams.get('ciklus') as Ciklus) || 'godisnje';
  const effCiklus = effectiveCiklus(plan, ciklus); // host je uvek godišnji

  const [polarReady, setPolarReady] = useState<boolean | null>(null); // null = proverava se
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | undefined>(undefined);
  const [cardError, setCardError] = useState('');

  const cenaKartica = useMemo(() => cenaEur(plan, effCiklus), [plan, effCiklus]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let alive = true;
    isPolarConfigured().then((ok) => { if (alive) setPolarReady(ok); });
    return () => { alive = false; };
  }, []);

  // Kad je Polar podešen, napravi sesiju i ugradi checkout iframe u stranicu.
  useEffect(() => {
    if (!polarReady || !user) return;
    let alive = true;
    setCardError('');
    createPolarCheckoutUrl({ plan: plan.id, ciklus: effCiklus, theme: theme === 'dark' ? 'dark' : 'light' })
      .then(({ url, id }) => { if (alive) { setCheckoutUrl(url); setCheckoutId(id); } })
      .catch((err) => { if (alive) setCardError(err instanceof Error ? err.message : 'Kartično plaćanje trenutno nije dostupno.'); });
    return () => { alive = false; };
  }, [polarReady, user, plan.id, effCiklus, theme]);

  // Polar iframe javi 'success' porukom po uspešnoj uplati -> vodimo u portal.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e.origin.includes('polar')) return;
      const d = e.data as { event?: string } | undefined;
      if (d && d.event === 'success') {
        const cid = checkoutId ? `&cid=${encodeURIComponent(checkoutId)}` : '';
        navigate(`/dashboard?checkout=success${cid}`, { replace: true });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [navigate, checkoutId]);

  const goFirma = () => navigate(`/checkout/firma?plan=${plan.id}&ciklus=${effCiklus}`);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Kompaktno zaglavlje u jednom redu */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/pretplata?plan=${plan.id}&ciklus=${ciklus}`)}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={18} /> Nazad na izbor paketa
          </button>
          <span className="text-sm text-gray-400">
            {plan.name} · {effCiklus === 'godisnje' ? 'godišnje' : 'mesečno'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 lg:gap-14 items-start">
          {/* ── LEVO: Plaćanje po fakturi — tiha sekundarna opcija ────────── */}
          <aside className="lg:pt-1 lg:order-1 order-2">
            <div className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
              <Building2 className="text-infinity-green-600" size={18} />
              <h2 className="font-semibold">Plaćate kao firma?</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Za firme u sistemu PDV-a — šaljemo e-fakturu na SEF, plaćate virmanom. Pristup se
              otključava odmah.
            </p>
            <button
              type="button"
              onClick={goFirma}
              className="group relative overflow-hidden inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold
                         text-infinity-green-800 dark:text-white
                         bg-gradient-to-r from-white/90 via-white/60 to-white/80
                         dark:from-white/30 dark:via-white/[0.14] dark:to-white/25
                         backdrop-blur-xl
                         border border-white/95 dark:border-white/30
                         shadow-[0_6px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.30)]
                         hover:shadow-[0_10px_30px_rgba(16,185,129,0.30)]
                         hover:-translate-y-0.5 transition-all duration-300"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full
                           bg-gradient-to-b from-white/70 to-transparent dark:from-white/25"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-[20deg]
                           bg-gradient-to-r from-transparent via-white/80 to-transparent
                           -translate-x-[180%] group-hover:translate-x-[360%]
                           transition-transform duration-[900ms] ease-out"
              />
              <span className="relative">Plati kao firma</span>
              <ArrowRight size={16} className="relative transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </aside>

          {/* ── DESNO: Kartično plaćanje ──────────────────────────────────── */}
          <section className="lg:order-2 order-1">
            <div className="flex items-baseline justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plaćanje karticom</h1>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{eur(cenaKartica)}</span>
                <span className="text-sm text-gray-400"> / {effCiklus === 'godisnje' ? 'god.' : 'mes.'}</span>
              </div>
            </div>

            {polarReady === false ? (
              <>
                <CardFormMock />
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  Kartično plaćanje još nije podešeno na serveru ({MERCHANT_OF_RECORD.name}).
                </p>
              </>
            ) : checkoutUrl ? (
              <iframe
                title="Plaćanje karticom"
                src={checkoutUrl}
                className="w-full block lg:-ml-12"
                style={{ height: 1250, border: 'none', colorScheme: 'auto' }}
              />
            ) : cardError ? (
              <p className="py-6 text-sm text-red-600 dark:text-red-400">{cardError}</p>
            ) : (
              <div className="flex items-center gap-2 py-10 text-gray-400">
                <Loader2 size={18} className="animate-spin" /> Učitavanje forme za plaćanje…
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Maketa kartične forme — samo kad Polar nije podešen na serveru, da se vidi
 * raspored. Prava (Polar) forma se ugrađuje u iframe čim se podese ključevi.
 */
function CardFormMock() {
  const Field = ({ label, placeholder, wide = true }: { label: string; placeholder: string; wide?: boolean }) => (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-infinity-dark-600 bg-white dark:bg-infinity-dark-800 text-gray-400 text-[15px] select-none">
        {placeholder}
      </div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4 opacity-70 pointer-events-none">
      <Field label="Email" placeholder="vas@email.rs" />
      <Field label="Broj kartice" placeholder="1234 5678 9012 3456" />
      <Field label="Datum isteka" placeholder="MM / GG" wide={false} />
      <Field label="CVC" placeholder="123" wide={false} />
      <Field label="Ime na kartici" placeholder="Ime Prezime" />
    </div>
  );
}
