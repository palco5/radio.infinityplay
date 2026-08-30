import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { BillingPortalPayment } from '../../lib/api';

/** Podaci za uplatu: račun, poziv na broj, iznos + IPS QR za mobilnu banku. */
export default function PaymentDetails({ payment }: { payment: BillingPortalPayment }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-infinity-dark-700 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
        <p className="font-semibold text-gray-900 dark:text-white truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => copy(label, value)}
        className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-infinity-green-600 hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
        aria-label={`Kopiraj ${label}`}
      >
        {copied === label ? <Check size={16} className="text-infinity-green-600" /> : <Copy size={16} />}
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 items-start">
      <div>
        <Row label="Primalac" value={payment.primalac} />
        <Row label="Račun" value={payment.racun} />
        <Row label="Poziv na broj (97)" value={payment.poziv_na_broj} />
        <Row label="Iznos" value={`${Number(payment.ukupno).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} ${payment.valuta}`} />
      </div>
      {payment.qr && (
        <div className="text-center">
          <img src={payment.qr} alt="IPS QR kôd" className="w-40 h-40 mx-auto rounded-xl bg-white p-2 shadow-sm" />
          <p className="text-xs text-gray-400 mt-2 max-w-[160px]">Skenirajte u mobilnoj banci</p>
        </div>
      )}
    </div>
  );
}
