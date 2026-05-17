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
    if (plan.id === 'host-radio' || plan.id === 'branded-radio') {
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
    <section id="pricing" className="py-12 md:py-20 bg-gray-50 dark:bg-[#0F172A] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Pretplate i Benefiti
          </h2>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4 md:mb-6">
            Odaberite plan koji najbolje odgovara vašim potrebama
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                hover
                className={`relative ${plan.popular ? 'ring-2 ring-infinity-green-500 md:scale-105 overflow-visible z-10' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 md:-top-5 left-1/2 transform -translate-x-1/2 bg-gradient-infinity px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-lg z-20 whitespace-nowrap">
                    <span className="text-white text-xs md:text-sm font-bold tracking-wide uppercase">NAJPOPULARNIJI</span>
                  </div>
                )}

                <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-3 md:mb-4 shadow-lg`}>
                  <Icon className="text-white" size={24} />
                </div>

                <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                  {plan.name}
                </h3>

                <div className="mb-4 md:mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-infinity-green-600 ml-1">
                      {plan.currency}
                    </span>
                  </div>
                  <p className="text-center text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                    {plan.interval}
                  </p>
                </div>

                {plan.trial && (
                  <div className="mb-4 md:mb-6 bg-infinity-green-100 dark:bg-infinity-green-900/20 border-2 border-infinity-green-500 rounded-2xl p-3 md:p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Sparkles className="text-infinity-green-600" size={18} />
                      <span className="text-sm md:text-base text-infinity-green-700 dark:text-infinity-green-400 font-bold">
                        {plan.trial.highlight}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
                      Ako ne otkažete tokom 7 dana, automatski se naplaćuje pretplata
                    </p>
                  </div>
                )}

                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-infinity-green-600 mr-2 flex-shrink-0 mt-0.5" size={18} />
                      <span className="text-sm md:text-base text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.id === 'host-radio' || plan.id === 'branded-radio' ? 'Kontaktiraj nas' : 'Započni Sada'}
                </Button>
              </Card>
            );
          })}
        </div>


      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        selectedPlan={selectedPlan}
        defaultTab="register"
      />

      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Kontaktirajte nas"
      >
        <div className="space-y-4">
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
            {selectedPlan?.name} je profesionalno rešenje koje zahteva dodatnu konfiguraciju i podešavanje prema vašim specifičnim potrebama.
          </p>
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
            Molimo vas da nas kontaktirate direktno kako bismo zajedno kreirali idealno rešenje za vas:
          </p>
          <div className="bg-infinity-green-50 dark:bg-infinity-green-900/20 p-4 md:p-6 rounded-2xl border-2 border-infinity-green-500">
            <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2">
              Email: info@infinityplay.rs
            </p>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Odgovaramo u roku od 24 sata
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => window.location.href = `mailto:info@infinityplay.rs?subject=Upit za ${selectedPlan?.name}`}
          >
            Pošalji Email
          </Button>
        </div>
      </Modal>
    </section>
  );
}
