import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { localAuth } from '../lib/localStorage';
import { Check, CreditCard, Shield, Clock, Building2, MapPin } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const pricingPlans = [
  {
    id: 'web-radio',
    name: 'WEB RADIO',
    price: 15,
    currency: '€',
    interval: 'mesečno',
    trialDays: 7,
    features: [
      'Mogućnost slušanja bilo koje dostupne stanice',
      'Pristup svim žanrovima muzike',
      'HD kvalitet zvuka (320kbps)',
      'Bez reklama',
      'Podrška putem emaila',
      'Otkaži u bilo kom trenutku',
    ],
    discounts: [
      { months: 5, discount: '10%' },
      { months: 10, discount: '20%' }
    ]
  },
  {
    id: 'box-radio',
    name: 'BOX RADIO',
    price: 50,
    currency: '€',
    interval: 'mesečno',
    features: [
      'Sve iz WEB RADIO paketa',
      'Personalizovani stream sa vašim džinglovima',
      'Prilagođena plejlista',
      'Brendirana grafika i vizuelni identitet',
      'Prioritetna podrška 24/7',
      'Promotivna sekcija na početnoj stranici',
      'Mesečni izveštaj o slušanosti',
    ],
    discounts: [
      { months: 5, discount: '10%' },
      { months: 10, discount: '20%' }
    ]
  },
  {
    id: 'moj-radio',
    name: 'MOJ RADIO',
    price: 240,
    currency: '€',
    interval: 'godišnje',
    features: [
      'Sve iz BOX RADIO paketa',
      'Potpuno prilagođen radio stream',
      'Neograničeni džinglovi i reklame',
      'Dedikovan server',
      'VIP podrška 24/7',
      'Mesečni detaljni izveštaji',
      'Marketinška podrška',
      'Ušteda od 33% u odnosu na mesečno plaćanje',
    ],
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
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>('other');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const planId = searchParams.get('plan');
    if (planId) {
      setSelectedPlan(planId);
    } else {
      setSelectedPlan('web-radio');
    }
  }, [user, searchParams, navigate]);

  const plan = pricingPlans.find(p => p.id === selectedPlan);

  const handlePayment = async () => {
    if (!plan || !user) return;

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user profile based on selected plan
      const updates: any = {
        subscription_status: 'active',
        subscription_tier: plan.id,
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Handle Trial for Web Radio
      if (plan.id === 'web-radio') {
        updates.subscription_status = 'trial';
        updates.trial_started_at = new Date().toISOString();
        updates.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      localAuth.updateProfile(user.id, updates);

      navigate('/dashboard');
    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
    }
  };

  const renderPaymentInstructions = () => {
    switch (selectedCountry) {
      case 'serbia':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <Building2 className="text-blue-600 mr-3" size={32} />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Bankovski Transfer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Za korisnike iz Srbije</p>
              </div>
            </div>

            <div className="space-y-3 bg-white dark:bg-infinity-dark-800 rounded-xl p-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Primalac:</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">
                  Bitrejt d.o.o. Beograd
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Banka:</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">
                  NLB Komercijalna banka
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Broj računa:</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">
                  205-0000000357135-48
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Iznos:</p>
                <p className="font-mono font-bold text-infinity-green-600 text-xl">
                  {plan?.price} {plan?.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Poziv na broj:</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">
                  {user?.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Napomena:</strong> PayPal/Kartica plaćanje iz Srbije nije preporučeno zbog visokih provizija.
              </p>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
              Nakon izvršene uplate, vaš nalog će biti aktiviran u roku od 24h.
            </p>
          </div>
        );

      case 'montenegro':
      case 'croatia':
      case 'bih':
        return (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <MapPin className="text-green-600 mr-3" size={32} />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">PostKeš Usluga</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Za korisnike iz {countryNames[selectedCountry]}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                Plaćanje možete izvršiti preko <strong>PostKeš</strong> servisa u najbližoj pošti.
              </p>

              <div className="bg-white dark:bg-infinity-dark-800 rounded-xl p-4">
                <div className="mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Iznos za uplatu:</p>
                  <p className="font-mono font-bold text-infinity-green-600 text-2xl">
                    {plan?.price} {plan?.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vaš referentni broj:</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white text-lg">
                    {user?.id.substring(0, 10).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p><strong>Koraci za plaćanje:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Posetite najbližu poštu</li>
                  <li>Tražite PostKeš uslugu</li>
                  <li>Navedite iznos i referentni broj</li>
                  <li>Sačuvajte potvrdu o uplati</li>
                </ol>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                Aktivacija naloga sledi u roku od 24-48h nakon uplate.
              </p>
            </div>
          </div>
        );

      case 'other':
      default:
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="text-blue-600 mr-3" size={32} />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">PayPal / Kartica</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sigurno online plaćanje</p>
                </div>
              </div>
              <Shield className="text-blue-600" size={24} />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Kliknite na dugme ispod da biste nastavili sa PayPal plaćanjem.
              Biće preusmereni na PayPal stranicu za sigurnu obradu plaćanja.
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-start">
                <Check className="text-green-600 mr-2 flex-shrink-0 mt-0.5" size={18} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  256-bit SSL enkripcija
                </span>
              </div>
              <div className="flex items-start">
                <Check className="text-green-600 mr-2 flex-shrink-0 mt-0.5" size={18} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Prihvatamo sve glavne kreditne kartice
                </span>
              </div>
              <div className="flex items-start">
                <Check className="text-green-600 mr-2 flex-shrink-0 mt-0.5" size={18} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Otkaži pretplatu u bilo kom trenutku
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Obrada...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2" size={20} />
                  Plati sa PayPal
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-3">
              Klikom na "Plati sa PayPal" prihvatate naše Uslove korišćenja
            </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-infinity-green-50 dark:from-infinity-dark-900 dark:to-infinity-dark-800 pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Završite Pretplatu
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Odaberite paket i metod plaćanja
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Plan Selection */}
          <div>
            <Card>
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">
                Odabrani Paket
              </h2>

              <div className="bg-gradient-infinity p-6 rounded-2xl mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline text-white mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-xl ml-1">{plan.currency}</span>
                  <span className="text-sm ml-2 opacity-90">/ {plan.interval}</span>
                </div>
                {plan.trialDays && (
                  <div className="flex items-center bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                    <Clock className="mr-2" size={20} />
                    <span className="font-medium">Probaj {plan.trialDays} dana besplatno!</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="text-infinity-green-600 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {plan.discounts && (
                <div className="bg-infinity-green-50 dark:bg-infinity-green-900/20 border border-infinity-green-200 dark:border-infinity-green-800 rounded-xl p-4 mb-6">
                  <p className="font-bold text-gray-900 dark:text-white mb-2">💰 Popusti za unapred plaćanje:</p>
                  {plan.discounts.map((discount, idx) => (
                    <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                      • {discount.months} meseci unapred: <strong>{discount.discount} popusta</strong>
                    </p>
                  ))}
                </div>
              )}

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
                    <span className="font-medium text-gray-900 dark:text-white">
                      {p.name} - {p.price}{p.currency}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      / {p.interval}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Payment Method */}
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

              {/* Manual Payment Note for Serbia and Regional */}
              {(selectedCountry === 'serbia' || selectedCountry === 'montenegro' ||
                selectedCountry === 'croatia' || selectedCountry === 'bih') && (
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        alert('Instrukcije za plaćanje su prikazane iznad. Nakon uplate, kontaktirajte nas sa potvrdom.');
                        navigate('/dashboard');
                      }}
                    >
                      Razumem instrukcije
                    </Button>
                  </div>
                )}
            </Card>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-infinity-green-600 hover:text-infinity-green-700 font-medium"
              >
                ← Nazad na početnu
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
