import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useState } from 'react';
import Modal from '../ui/Modal';
import AuthModal from '../auth/AuthModal';
import { useAuth } from '../../contexts/AuthContext';

const pricingPlans = [
  {
    id: 'basic-radio',
    name: 'BASIC RADIO',
    price: 15,
    currency: '€',
    interval: 'mesečno',
    icon: Sparkles,
    color: 'from-infinity-green-400 to-infinity-green-600',
    trial: {
      enabled: true,
      days: 7,
      highlight: 'Probaj 7 dana besplatno!',
    },
    features: [
      'Mogućnost slušanja bilo koje dostupne stanice',
      'Pristup svim žanrovima muzike',
      'HD kvalitet zvuka (320kbps)',
      'Bez reklama tokom probnog perioda',
      'Podrška putem emaila',
      'Otkaži u bilo kom trenutku',
    ],
  },
  {
    id: 'branded-radio',
    name: 'BRANDED RADIO',
    price: 35,
    currency: '€',
    interval: 'mesečno',
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    features: [
      'Sve iz BASIC RADIO paketa',
      'Personalizovani stream sa vašim džinglovima',
      'Prilagođena plejlista',
      'Brendirana grafika i vizuelni identitet',
      'Prioritetna podrška 24/7',
      'Promotivna sekcija na početnoj stranici',
      'Mesečni izveštaj o slušanosti',
    ],
  },
  {
    id: 'host-radio',
    name: 'HOST RADIO',
    price: 195,
    currency: '€',
    interval: 'godišnje',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    features: [
      'Sve iz BRANDED RADIO paketa',
      'Pristup InfinityPlay admin panelu',
      'Kreirajte i uređujte svoje radio stanice',
      'Upravljanje plejlistama i reklamama',
      'Praćenje broja slušalaca u realnom vremenu',
      'Profesionalni hosting i tehnička podrška',
      'Neograničen broj džinglova',
      'Ekskluzivne promotivne mogućnosti',
      'Prioritetna tehni čka podrška',
    ],
  },
];

export default function PricingSection() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null);

  const [showContactModal, setShowContactModal] = useState(false);

  const handlePlanSelect = (plan: typeof pricingPlans[0]) => {
    setSelectedPlan(plan);
    if (plan.id === 'host-radio') {
      setShowContactModal(true);
      return;
    }
    if (!user) {
      setShowAuthModal(true);
    } else {
      window.location.href = `#checkout?plan=${plan.id}`;
    }
  };

  return (
    <section id="pricing" className="py-20 bg-infinity-green-50 dark:bg-infinity-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Pretplate i Benefiti
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
            Odaberite plan koji najbolje odgovara vašim potrebama
          </p>
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-infinity-green-50 to-blue-50 dark:from-infinity-dark-800 dark:to-infinity-dark-700 p-8 rounded-3xl border-2 border-infinity-green-200 dark:border-infinity-green-800">
            <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
              Najbolje rešenje za puštanje muzike u poslovnim objektima
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Naši planovi su idealni za <strong>kafiće, restorane, teretane, spa centre, prodavnice, kancelarije</strong> i sve druge poslovne prostore gde želite da kreirate savršenu atmosferu kvalitetnom muzikom.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                hover
                className={`relative ${plan.popular ? 'ring-4 ring-infinity-green-500 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-infinity px-4 py-1 rounded-full shadow-lg">
                    <span className="text-white text-sm font-bold">NAJPOPULARNIJI</span>
                  </div>
                )}

                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="text-white" size={32} />
                </div>

                <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">
                  {plan.name}
                </h3>

                <div className="mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-2xl font-bold text-infinity-green-600 ml-1">
                      {plan.currency}
                    </span>
                  </div>
                  <p className="text-center text-gray-600 dark:text-gray-400 mt-1">
                    {plan.interval}
                  </p>
                </div>

                {plan.trial && (
                  <div className="mb-6 bg-infinity-green-100 dark:bg-infinity-green-900/20 border-2 border-infinity-green-500 rounded-2xl p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Sparkles className="text-infinity-green-600" size={20} />
                      <span className="text-infinity-green-700 dark:text-infinity-green-400 font-bold">
                        {plan.trial.highlight}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
                      Ako ne otkažete tokom 7 dana, automatski se naplaćuje pretplata
                    </p>
                  </div>
                )}

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-infinity-green-600 mr-2 flex-shrink-0 mt-0.5" size={20} />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.id === 'host-radio' ? 'Kontaktiraj nas' : 'Započni Sada'}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Svi planovi uključuju PayPal sigurna plaćanja
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Možete otkazati pretplatu u bilo kom trenutku iz vašeg naloga
          </p>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        selectedPlan={selectedPlan}
      />

      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Kontaktirajte nas za HOST RADIO"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            HOST RADIO je profesionalno rešenje koje zahteva dodatnu konfiguraciju i podešavanje prema vašim specifičnim potrebama.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Molimo vas da nas kontaktirate direktno kako bismo zajedno kreirali idealno rešenje za vas:
          </p>
          <div className="bg-infinity-green-50 dark:bg-infinity-green-900/20 p-6 rounded-2xl border-2 border-infinity-green-500">
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Email: info@infinityplay.rs
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Odgovaramo u roku od 24 sata
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => window.location.href = 'mailto:info@infinityplay.rs?subject=HOST RADIO upit'}
          >
            Pošalji Email
          </Button>
        </div>
      </Modal>
    </section>
  );
}
