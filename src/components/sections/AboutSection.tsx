import { Headphones, Users, Heart, Zap } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="about" className="py-12 md:py-20 bg-white dark:bg-[#0F172A] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
              O Platformi InfinityPlay
            </h2>
            <p className="text-base md:text-xl text-gray-600 dark:text-gray-400">
              InfinityPlay Radio je moderna platforma za streaming muzike koja vam donosi najbolje iz sveta online radio stanica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="flex flex-col items-center text-center p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-infinity rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 shadow-glow-green">
                <Headphones className="text-white" size={24} />
              </div>
              <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Visok Kvalitet
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Uživajte u kristalno čistom zvuku sa našim HD audio streamovima
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Zajednica
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Pridružite se hiljadama slušalaca širom sveta
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 shadow-lg">
                <Heart className="text-white" size={24} />
              </div>
              <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Strast
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Kreirano sa ljubavlju prema muzici i tehnologiji
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 shadow-lg">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Inovacija
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Kontinuirano unapređujemo vaše iskustvo slušanja
              </p>
            </div>
          </div>

          <div className="bg-infinity-green-50 dark:bg-infinity-dark-800 rounded-2xl md:rounded-3xl p-6 md:p-12">
            <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4 text-center">
              Naša Misija
            </h3>
            <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 text-center mb-4 md:mb-6">
              Želimo da svakome omogućimo pristup kvalitetnom radio sadržaju, bilo da ste individualni slušalac, vlasnik biznisa ili kreator sopstvenih radio stanica. InfinityPlay Radio je više od platforme - to je prostor gde se muzika, tehnologija i kreativnost susreću.
            </p>
            <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 text-center">
              Donosimo vam kompletan ekosistem za sve vaše multimedijalne potrebe.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
