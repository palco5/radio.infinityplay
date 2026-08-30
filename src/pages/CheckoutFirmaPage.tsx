import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, Loader2, AlertCircle, FileText, Clock, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { billing } from '../lib/api';
import { getPlan, cenaPoLokaciji, rsd, PDV_STOPA, effectiveCiklus } from '../lib/plans';
import { isValidPIB, normalizeId } from '../lib/pib';

/**
 * /checkout/firma — plaćanje po fakturi. Jednostavna forma, sva polja odjednom.
 * Traži se PIB (matični broj se ne traži — PIB je dovoljan za fakturu).
 */
export default function CheckoutFirmaPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = getPlan(searchParams.get('plan'));

  const [pib, setPib] = useState('');
  const [naziv, setNaziv] = useState('');
  const [adresa, setAdresa] = useState('');
  const [grad, setGrad] = useState('');
  const [postanski, setPostanski] = useState('');
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? '');
  const [kontakt, setKontakt] = useState('');
  const [uSistemuPdv, setUSistemuPdv] = useState(true);
  // Ciklus se bira na /pretplata i stiže kroz URL; ovde se ne menja.
  const [ciklusRaw] = useState<'mesecno' | 'godisnje'>(
    (searchParams.get('ciklus') as 'mesecno' | 'godisnje') || 'godisnje'
  );
  const ciklus = effectiveCiklus(plan, ciklusRaw); // host je uvek godišnji
  const [brojLokacija, setBrojLokacija] = useState(1);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const summary = useMemo(() => {
    const cenaLok = cenaPoLokaciji(plan, ciklus);
    const osnovica = cenaLok * brojLokacija;
    const pdv = (osnovica * PDV_STOPA) / 100; // prodavac je u PDV-u -> uvek 20%
    const ukupno = osnovica + pdv;
    return { cenaLok, osnovica, pdv, ukupno };
  }, [plan, ciklus, brojLokacija]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!isValidPIB(pib)) e.pib = 'PIB nije ispravan (9 cifara sa kontrolnom cifrom).';
    if (naziv.trim() === '') e.naziv = 'Naziv firme je obavezan.';
    if (adresa.trim() === '') e.adresa = 'Adresa je obavezna.';
    if (grad.trim() === '') e.grad = 'Grad je obavezan.';
    if (postanski.trim() === '') e.postanski_broj = 'Poštanski broj je obavezan.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Mejl za fakture nije ispravan.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await billing.firmaCheckout({
        plan: plan.id,
        ciklus,
        broj_lokacija: brojLokacija,
        pib: normalizeId(pib),
        naziv: naziv.trim(),
        adresa: adresa.trim(),
        grad: grad.trim(),
        postanski_broj: postanski.trim(),
        email: email.trim(),
        kontakt_osoba: kontakt.trim() || undefined,
        u_sistemu_pdv: uSistemuPdv,
      });
      try { await refreshProfile(); } catch { /* ne blokiraj redirect */ }
      navigate(result.redirect || '/dashboard', { replace: true });
    } catch (err) {
      const anyErr = err as { data?: { fields?: Record<string, string> }; message?: string };
      if (anyErr.data?.fields) setErrors(anyErr.data.fields);
      setSubmitError(anyErr.message || 'Slanje nije uspelo. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white transition-colors outline-none focus:border-infinity-green-500 ${
      errors[field] ? 'border-red-400' : 'border-gray-200 dark:border-infinity-dark-600'
    }`;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
        <AlertCircle size={14} /> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 pt-24 md:pt-28 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/checkout?plan=${plan.id}&ciklus=${ciklus}`)}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-white mb-6 text-sm"
        >
          <ArrowLeft size={18} /> Nazad na izbor plaćanja
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-infinity-green-50 dark:bg-infinity-green-900/30 flex items-center justify-center">
            <Building2 className="text-infinity-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Plaćanje po fakturi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{plan.name}</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-infinity-dark-800 rounded-3xl shadow-lg p-6 md:p-8 space-y-5">
          {/* Plaćanje po fakturi je u pripremi — overlay preko forme */}
          <div className="absolute inset-0 z-10 rounded-3xl bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-4">
              <Clock className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">U procesu</h3>
            <p className="text-white/90 max-w-sm mb-5">
              Plaćanje po fakturi je trenutno u pripremi. Za aktivaciju nas kontaktirajte telefonom:
            </p>
            <a
              href="tel:+38169602902"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-900 font-bold shadow-lg hover:scale-[1.03] transition-transform"
            >
              <Phone size={18} /> +381 69 602902
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">PIB *</label>
              <input
                className={inputCls('pib')}
                value={pib}
                inputMode="numeric"
                maxLength={9}
                placeholder="npr. 100002887"
                onChange={(e) => setPib(e.target.value.replace(/\D/g, ''))}
              />
              <FieldError field="pib" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Naziv firme *</label>
              <input className={inputCls('naziv')} value={naziv} placeholder="npr. Vaša firma d.o.o." onChange={(e) => setNaziv(e.target.value)} />
              <FieldError field="naziv" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Adresa *</label>
              <input className={inputCls('adresa')} value={adresa} placeholder="Ulica i broj" onChange={(e) => setAdresa(e.target.value)} />
              <FieldError field="adresa" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Grad *</label>
              <input className={inputCls('grad')} value={grad} placeholder="npr. Beograd" onChange={(e) => setGrad(e.target.value)} />
              <FieldError field="grad" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Poštanski broj *</label>
              <input className={inputCls('postanski_broj')} value={postanski} inputMode="numeric" placeholder="npr. 11000" onChange={(e) => setPostanski(e.target.value)} />
              <FieldError field="postanski_broj" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">E-mail za fakture *</label>
              <input className={inputCls('email')} value={email} type="email" placeholder="fakture@firma.rs" onChange={(e) => setEmail(e.target.value)} />
              <FieldError field="email" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Ime i prezime kontakt osobe <span className="font-normal text-gray-400">(opciono)</span>
              </label>
              <input className={inputCls('kontakt_osoba')} value={kontakt} onChange={(e) => setKontakt(e.target.value)} />
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-infinity-dark-700 cursor-pointer">
            <input type="checkbox" checked={uSistemuPdv} onChange={(e) => setUSistemuPdv(e.target.checked)} className="mt-1 w-5 h-5 accent-infinity-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Firma je u sistemu PDV-a / registrovana na SEF
              <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Kada je označeno, e-faktura se šalje na SEF. U svakom slučaju stiže i na mejl.
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Broj lokacija</label>
            <input
              type="number"
              min={1}
              max={999}
              value={brojLokacija}
              onChange={(e) => setBrojLokacija(Math.max(1, Math.min(999, parseInt(e.target.value || '1', 10))))}
              className={inputCls('broj_lokacija')}
            />
          </div>

          <div className="rounded-2xl border-2 border-gray-100 dark:border-infinity-dark-700 p-5">
            <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-semibold">
              <FileText size={18} className="text-infinity-green-600" /> Sažetak
            </div>
            <div className="space-y-1.5 text-sm">
              <Row label={`${plan.name} — ${ciklus === 'godisnje' ? 'godišnje' : 'mesečno'} × ${brojLokacija} lok.`} value={rsd(summary.osnovica)} />
              <Row label="Cena po lokaciji" value={rsd(summary.cenaLok)} muted />
              <Row label={`PDV (${PDV_STOPA}%)`} value={rsd(summary.pdv)} muted />
              <div className="border-t border-gray-100 dark:border-infinity-dark-700 my-2" />
              <Row label="Ukupno za uplatu" value={rsd(summary.ukupno)} bold />
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{submitError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-infinity text-white font-bold py-4 rounded-2xl hover:shadow-glow-green hover:scale-[1.01] transition-all disabled:opacity-60"
          >
            {submitting ? <><Loader2 size={20} className="animate-spin" /> Obrađujem…</> : <><Check size={20} /> Pošalji fakturu i aktiviraj pristup</>}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Pristup se otključava odmah. E-faktura stiže na SEF i na mejl.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'} ${bold ? 'font-bold text-gray-900 dark:text-white' : ''}`}>{label}</span>
      <span className={`${bold ? 'font-bold text-lg text-gray-900 dark:text-white' : muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{value}</span>
    </div>
  );
}
