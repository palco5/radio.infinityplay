import { Monitor, Smartphone, Tablet, Play, Music, TrendingUp } from 'lucide-react';

export default function DashboardPreviewSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-infinity-green-50 dark:from-infinity-dark-900 dark:to-infinity-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Vaš Dashboard Na Svakom Uređaju
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Pristupite vašim omiljenim stanicama bilo gde, bilo kada - na računaru, tabletu ili telefonu
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <div className="relative z-10 mb-12">
              <div className="bg-white dark:bg-infinity-dark-800 rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900 dark:border-gray-700">
                <div className="bg-gray-200 dark:bg-gray-700 px-4 py-3 flex items-center space-x-2">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-600 rounded px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                    InfinityPlay Dashboard
                  </div>
                </div>

                <div className="bg-gradient-to-br from-infinity-green-50 to-blue-50 dark:from-infinity-dark-900 dark:to-infinity-dark-800 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        Dobrodošli nazad!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Vaše omiljene radio stanice
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-infinity rounded-full">
                      <span className="text-white font-bold text-sm">PREMIUM</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-xl p-4 text-white">
                      <Music size={24} className="mb-2" />
                      <p className="text-2xl font-bold">50+</p>
                      <p className="text-sm opacity-90">Stanica</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white">
                      <Play size={24} className="mb-2" />
                      <p className="text-2xl font-bold">1,234</p>
                      <p className="text-sm opacity-90">Minuta</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 text-white">
                      <TrendingUp size={24} className="mb-2" />
                      <p className="text-2xl font-bold">Aktivno</p>
                      <p className="text-sm opacity-90">Slušanje</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-infinity-dark-700 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-600 hover:border-infinity-green-500 transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-infinity rounded-lg mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded mb-1"></div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 z-20 transform rotate-3 hidden md:block">
                <div className="bg-white dark:bg-infinity-dark-800 rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-900 dark:border-gray-700 w-48">
                  <div className="bg-gray-900 px-3 py-2">
                    <div className="w-16 h-1 bg-gray-600 rounded-full mx-auto mb-1"></div>
                  </div>
                  <div className="bg-gradient-to-br from-infinity-green-50 to-blue-50 dark:from-infinity-dark-900 dark:to-infinity-dark-800 p-4">
                    <div className="space-y-2 mb-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-infinity-dark-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="w-6 h-6 bg-gradient-infinity rounded mb-1"></div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-900 h-8"></div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 z-20 transform -rotate-3 hidden lg:block">
                <div className="bg-white dark:bg-infinity-dark-800 rounded-2xl shadow-2xl overflow-hidden border-6 border-gray-900 dark:border-gray-700 w-64">
                  <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-infinity-green-50 to-blue-50 dark:from-infinity-dark-900 dark:to-infinity-dark-800 p-4">
                    <div className="space-y-2 mb-3">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-infinity-dark-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="w-8 h-8 bg-gradient-infinity rounded mb-1"></div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Monitor className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Desktop
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Potpuno optimizovan dashboard sa svim funkcijama za kompjutere i laptopove
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Tablet className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Tablet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Prilagođen interfejs za tablet uređaje sa touch kontrolama
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-infinity-green-500 to-infinity-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Smartphone className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                Mobile
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Responsive dizajn omogućava savršeno iskustvo na mobilnim telefonima
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
