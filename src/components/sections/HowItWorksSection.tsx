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
    <section id="how-it-works" className="py-12 md:py-20 bg-gray-50 dark:bg-[#0F172A] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Kako Funkcioniše InfinityPlay Radio
          </h2>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Samo 4 jednostavna koraka do neograničenog slušanja
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={index} className="relative">
                  <div className="bg-white dark:bg-[#1e293b] rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-shadow h-full">
                    <div className="text-center">
                      <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-4 md:mb-6 mx-auto shadow-lg`}>
                        <Icon className="text-white" size={32} />
                      </div>

                      <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-10 h-10 md:w-12 md:h-12 bg-gradient-infinity rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg md:text-xl">{index + 1}</span>
                      </div>

                      <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
                        {step.title}
                      </h3>

                      <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
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

        <div className="mt-12 md:mt-16 text-center">
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-2 md:mb-4">
            Sve je automatizirano i bez komplikacija
          </p>
          <p className="text-xl md:text-2xl font-serif font-bold text-infinity-green-600">
            Počni da slušaš za manje od 2 minuta!
          </p>
        </div>
      </div>
    </section>
  );
}
