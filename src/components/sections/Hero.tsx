import { useState } from 'react';
import { Radio, Play, LogIn } from 'lucide-react';
import Button from '../ui/Button';
import AuthModal from '../auth/AuthModal';

export default function Hero() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const scrollToPricing = () => {
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-gradient-to-br from-infinity-green-50 via-white to-infinity-green-100 dark:from-infinity-dark-900 dark:via-infinity-dark-800 dark:to-infinity-dark-900" />

      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-20 -left-40 w-96 h-96 bg-infinity-green-400 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
        <div className="absolute -top-10 -right-40 w-[500px] h-[500px] bg-infinity-green-300 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-infinity-green-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-infinity rounded-full mb-8 shadow-glow-green-lg animate-pulse-slow">
            <Radio className="text-white" size={40} />
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 dark:text-white mb-6 text-balance">
            Tvoj zvuk. Tvoj radio.
            <span className="block text-infinity-green-600 mt-2">InfinityPlay.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto text-balance">
            Otkrijte neograničene mogućnosti online radio platforme. Slušajte, kreirajte i personalizujte svoj zvuk.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowAuthModal(true)}
              className="shadow-xl"
            >
              <LogIn size={20} className="mr-2" />
              Uloguj se
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={scrollToPricing}
            >
              <Play size={20} className="mr-2" />
              Započni Besplatno 7 Dana
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-infinity-green-600 mb-2">30+</div>
              <div className="text-gray-600 dark:text-gray-400">Žanrova Muzike</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-infinity-green-600 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Neprekidno Streamovanje</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-infinity-green-600 mb-2">HD</div>
              <div className="text-gray-600 dark:text-gray-400">Visoki Kvalitet Zvuka</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-infinity-green-600 flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-infinity-green-600 rounded-full" />
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        selectedPlan={null}
      />
    </section>
  );
}
