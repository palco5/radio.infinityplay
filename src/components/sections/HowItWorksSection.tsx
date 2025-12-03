import { UserPlus, CreditCard, Radio, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Registruj se',
    description: 'Kreiraj svoj nalog za manje od minuta. Samo email i lozinka!',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CreditCard,
    title: 'Odaberi Paket',
    description: 'Izaberi plan koji odgovara tvojim potrebama. Probaj 7 dana besplatno!',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Radio,
    title: 'Slušaj Muziku',
    description: 'Počni da slušaš svoje omiljene radio stanice odmah!',
    color: 'from-infinity-green-400 to-infinity-green-600',
  },
  {
    icon: Sparkles,
    title: 'Uživaj',
    description: 'Personalizuj iskustvo, prati statistike i otkrivaj novo!',
    color: 'from-orange-500 to-red-500',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-infinity-green-50 dark:bg-infinity-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Kako Funkcioniše InfinityPlay Radio
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Samo 4 jednostavna koraka do neograničenog slušanja
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={index} className="relative">
                  <div className="bg-white dark:bg-infinity-dark-900 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-shadow h-full">
                    <div className="text-center">
                      <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg`}>
                        <Icon className="text-white" size={40} />
                      </div>

                      <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-infinity rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">{index + 1}</span>
                      </div>

                      <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
                        {step.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="w-8 h-1 bg-gradient-infinity" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Sve je automatizirano i bez komplikacija
          </p>
          <p className="text-2xl font-serif font-bold text-infinity-green-600">
            Počni da slušaš za manje od 2 minuta!
          </p>
        </div>
      </div>
    </section>
  );
}
