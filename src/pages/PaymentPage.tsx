import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check, CreditCard, Building2, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';

const pricingPlans = [
  {
    id: 'basic-radio',
    name: 'BASIC RADIO',
    price: 15,
    currency: '€',
    priceRsd: 1770,
    interval: 'mesečno',
    trialDays: 7,
    features: [
      'Pristup svim stanicama',
      'Bez reklama',
      'Visok kvalitet zvuka',
      'Podrška putem emaila'
    ]
  },
  {
    id: 'branded-radio',
    name: 'BRANDED RADIO',
    price: 35,
    currency: '€',
    priceRsd: 4130,
    interval: 'mesečno',
    features: [
      'Sve iz Basic paketa',
      'Brendirani džinglovi',
      'Prioritetna podrška',
      'Personalizovani stream'
    ]
  },
  {
    id: 'host-radio',
    name: 'HOST RADIO',
    price: 195,
    currency: '€',
    priceRsd: 23000,
    interval: 'godišnje',
    features: [
      'Sve iz Branded paketa',
      'Admin panel',
      'Kreiranje stanica',
      'Profesionalni hosting'
    ]
  },
];

type Country = 'serbia' | 'montenegro' | 'croatia' | 'bih' | 'other';

const countryNames = {
  serbia: 'Srbija',
  montenegro: 'Crna Gora',
  croatia: 'Hrvatska',
  bih: 'Bosna i Hercegovina',
  other: 'Ostale zemlje'
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>('other');

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (!user) {
      navigate('/');
      return;
    }

    const planId = searchParams.get('plan');
    if (planId) {
      setSelectedPlan(planId);
    } else {
      setSelectedPlan('basic-radio');
    }
  }, [user, searchParams, navigate]);

  const plan = pricingPlans.find(p => p.id === selectedPlan) || pricingPlans[0];

  const renderPaymentInstructions = () => {
    switch (selectedCountry) {
      case 'serbia':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <Building2 className="text-blue-600 mr-3" size={32} />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Bankovski Transfer (Srbija)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Instrukcije za uplatu:</p>
              </div>
            </div>

            <div className="space-y-4 bg-white dark:bg-infinity-dark-800 rounded-xl p-5 border border-blue-100 dark:border-blue-900">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Uplatilac</p>
                <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  {profile?.first_name || 'Vaše ime'}, {profile?.last_name || 'prezime'} ili naziv firme i mesto
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Svrha uplate</p>
                <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 break-all">
                  Infinityplay, {user?.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Primalac</p>
                <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  InfinityPlay Radio
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Račun</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white text-lg break-all">
                    205-0000000357135-48
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Model</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">
                    (ostaviti prazno)
                  </p>
                </div>
              </div>

              <div className="mt-2 text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Iznos za uplatu</p>
                <div className="flex items-end justify-end">
                  <p className="font-bold text-gray-400 dark:text-gray-500 text-lg mr-2 line-through">
                    {plan?.price} {plan?.currency}
                  </p>
                  <p className="font-mono font-bold text-infinity-green-600 text-3xl">
                    {(plan?.price * 117.5).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" size={20} />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Za firme:</strong> Fakturu dobijate na SEF ili putem emaila nakon evidentirane uplate.
              </p>
            </div>
          </div>
        );

      case 'montenegro':
      case 'croatia':
      case 'bih':
      case 'other':
      default:
        return (
          <div className="bg-gray-50 dark:bg-gray-900/20 border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="text-gray-400" size={32} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Uskoro dostupno
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Plaćanje za zemlje van Srbije biće omogućeno uskoro.
              Trenutno je moguće plaćanje samo za korisnike iz Srbije putem bankovnog transfera.
            </p>

            <div className="bg-white dark:bg-infinity-dark-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 inline-block text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Kontakt za informacije:</p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Email: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-600 hover:underline">support@infinityplay.rs</a></p>
              </div>
            </div>
          </div>
        );
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-infinity-dark-900">
        <p className="text-gray-600 dark:text-gray-400">Učitavanje...</p>
      </div>
    );
  }

  // Increased top padding to avoid header overlap
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 pt-32 pb-12 px-4 transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Izvršite Plaćanje
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Odaberite vaš paket i način plaćanja
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Leva strana - Detalji paketa */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Paket
              </h3>
              <div className="space-y-3">
                {pricingPlans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selectedPlan === p.id
                      ? 'border-infinity-green-500 bg-infinity-green-50 dark:bg-infinity-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-infinity-green-300'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {p.name}
                      </span>
                      <div className="text-right">
                        <span className="block font-bold text-infinity-green-600">
                          {p.price}{p.currency}
                        </span>
                        {selectedCountry === 'serbia' && (
                          <span className="block text-xs text-gray-500">
                            {p.priceRsd} RSD
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {p.interval}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Uključeno u paket:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                      <Check className="text-infinity-green-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Desna strana - Metod Plaćanja */}
          <div>
            <Card>
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">
                Metod Plaćanja
              </h2>

              {/* Country Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Odaberite vašu zemlju:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(countryNames) as Country[]).map((country) => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${selectedCountry === country
                        ? 'border-infinity-green-500 bg-infinity-green-50 dark:bg-infinity-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-infinity-green-300'
                        }`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {countryNames[country]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Instructions Based on Country */}
              {renderPaymentInstructions()}
            </Card>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-infinity-green-600 hover:text-infinity-green-700 font-medium"
              >
                ← Nazad na dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sva plaćanja su <strong>unapred (prepaid)</strong>. Kontaktirajte nas za dodatne informacije.
          </p>
        </div>
      </div>
    </div>
  );
}
