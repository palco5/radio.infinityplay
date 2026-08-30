import { useEffect, useMemo, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { BillingPortalState } from '../../lib/api';
import PaymentDetails from './PaymentDetails';

// MySQL "YYYY-MM-DD HH:MM:SS" -> Date (Safari-safe).
function parseDbDate(s: string): Date {
  return new Date(s.includes('T') ? s : s.replace(' ', 'T'));
}

function useCountdown(target: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!target) return '';
    const diff = parseDbDate(target).getTime() - now;
    if (diff <= 0) return 'ističe uskoro';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `još ${days} ${days === 1 ? 'dan' : 'dana'} ${hours}h`;
    return `još ${hours}h`;
  }, [target, now]);
}

/**
 * Nenametljiv banner za pending_payment: faktura poslata, pristup aktivan još X,
 * uz "Prikaži podatke za uplatu" (račun, poziv na broj, IPS QR).
 * Vraća null za sva ostala stanja (past_due se prikazuje kao blokada, ne banner).
 */
export default function BillingBanner({ portal }: { portal: BillingPortalState | null }) {
  const [open, setOpen] = useState(false);
  const sub = portal?.subscription;
  const countdown = useCountdown(sub?.access_until ?? null);

  if (!portal || !sub || sub.state !== 'pending_payment') return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0">
          <Clock className="text-amber-600 dark:text-amber-400" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">
            Faktura je poslata. Pristup vam je aktivan {countdown}.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Čim uplata bude evidentirana, pretplata se aktivira automatski.
          </p>
        </div>
        {portal.payment && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-infinity-dark-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:shadow-sm transition-all"
          >
            Podaci za uplatu {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {open && portal.payment && (
        <div className="px-4 pb-4">
          <div className="bg-white dark:bg-infinity-dark-800 rounded-xl p-4">
            <PaymentDetails payment={portal.payment} />
          </div>
        </div>
      )}
    </div>
  );
}
