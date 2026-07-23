import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-white dark:bg-infinity-dark-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-infinity-green-100 dark:bg-infinity-green-900/30 rounded-xl flex items-center justify-center">
              <Cookie className="text-infinity-green-600 dark:text-infinity-green-400" size={20} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Koristimo kolačiće</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Koristimo nužne kolačiće za funkcionisanje platforme i opcionalne za poboljšanje iskustva. Više informacija u{' '}
              <a href="/cookie-policy" className="text-infinity-green-600 dark:text-infinity-green-400 hover:underline font-medium">
                Politici kolačića
              </a>{' '}
              i{' '}
              <a href="/privacy-policy" className="text-infinity-green-600 dark:text-infinity-green-400 hover:underline font-medium">
                Politici privatnosti
              </a>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={decline}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-infinity-dark-700 transition-colors"
            >
              <X size={14} />
              Samo nužni
            </button>
            <button
              onClick={accept}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-infinity-green-600 hover:bg-infinity-green-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Check size={14} />
              Prihvati sve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
