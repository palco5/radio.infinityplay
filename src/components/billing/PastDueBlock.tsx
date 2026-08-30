import { AlertTriangle } from 'lucide-react';
import type { BillingPortalState } from '../../lib/api';
import PaymentDetails from './PaymentDetails';

/**
 * Puna blokada streama za past_due: stream ne radi, prikazujemo podatke za
 * uplatu + IPS QR. Čim uplata legne (reconciliation), pristup se vraća.
 */
export default function PastDueBlock({ portal }: { portal: BillingPortalState }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-infinity-dark-900 p-4">
      <div className="bg-white dark:bg-infinity-dark-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 to-orange-400" />
        <div className="p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white text-center mb-2">
            Pristup je pauziran
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6 text-sm leading-relaxed">
            Faktura još nije evidentirana kao plaćena. Izmirite uplatu i pristup se vraća
            automatski, obično isti dan.
          </p>

          {portal.payment ? (
            <div className="bg-gray-50 dark:bg-infinity-dark-700 rounded-2xl p-5">
              <PaymentDetails payment={portal.payment} />
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-infinity-dark-700 rounded-2xl p-5 text-center text-sm text-gray-500">
              Za podatke o uplati kontaktirajte podršku:{' '}
              <a href="mailto:support@infinityplay.rs" className="text-infinity-green-600 font-semibold">
                support@infinityplay.rs
              </a>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-5">
            Već ste uplatili? Uplata se knjiži jednom dnevno — sačekajte do sutra ili nas kontaktirajte.
          </p>
        </div>
      </div>
    </div>
  );
}
