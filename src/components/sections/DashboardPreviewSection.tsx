import { useState, useEffect } from 'react';
import { stations as stationsApi } from '../../lib/api';
import { RadioStation } from '../../types';
import StationCard from '../StationCard';
import { Play } from 'lucide-react';

export default function DashboardPreviewSection() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await stationsApi.getAll();
        const activeStations = data
          .filter((s: RadioStation) => s.is_active)
          .sort((a: RadioStation, b: RadioStation) => a.name.localeCompare(b.name))
          .slice(0, 8); // Show only first 8
        setStations(activeStations);
      } catch (err) {
        console.error('Failed to load stations for preview', err);
      } finally {
        setLoading(false);
      }
    };
    loadStations();
  }, []);

  const handleStationClick = () => {
    // Dispatch event to open auth modal since they are guests
    const event = new CustomEvent('OPEN_AUTH_MODAL', {
      detail: { defaultTab: 'login' }
    });
    window.dispatchEvent(event);
  };

  return (
    <section className="py-24 bg-[#0f1014] text-white overflow-hidden relative">
      {/* Background subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-infinity-green-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sve vaše omiljene stanice na jednom mestu.
          </h2>
          <p className="text-xl text-gray-400">
            Organizujte svoj svet muzike. Dodajte, slušajte i uživajte u beskonačnom izboru.
          </p>
        </div>

        {/* The Dashboard Mockup Container */}
        <div className="relative mx-auto max-w-6xl">
          {/* Browser frame look */}
          <div className="bg-[#1a1b20] rounded-xl border border-gray-800 shadow-2xl overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-[#131418] px-4 py-3 border-b border-gray-800 flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex-1 bg-[#1a1b20] h-8 rounded-lg border border-gray-700/50 flex items-center px-4 text-xs text-gray-500 font-mono">
                infinityplay.com/dashboard
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-[#1a1b20] to-[#131418] min-h-[600px]">

              {/* Fake Nav */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">Radio Stanice</h3>
                <div className="flex gap-3">
                  <div className="h-10 w-64 bg-gray-800 rounded-lg hidden md:block"></div>
                  <div className="h-10 w-10 bg-infinity-green-600 rounded-lg flex items-center justify-center">
                    <Play size={20} className="fill-current text-white" />
                  </div>
                </div>
              </div>

              {/* Grid of Stations */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-48 bg-gray-800 rounded-2xl"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stations.map(station => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isCurrentlyPlaying={false}
                      onClick={handleStationClick}
                      className="bg-[#25262b] border-[#2c2e33] hover:border-infinity-green-500/50 hover:bg-[#2c2e33] transform hover:-translate-y-1 transition-all duration-300"
                    />
                  ))}
                  {/* Call to action card if less than 8 or just always at end? */}
                  {stations.length < 8 && (
                    <div onClick={handleStationClick} className="h-full min-h-[180px] rounded-2xl border-2 border-dashed border-gray-800 hover:border-infinity-green-500/50 flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-white transition-colors group">
                      <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-infinity-green-900/20 flex items-center justify-center mb-3 transition-colors">
                        <span className="text-2xl">+</span>
                      </div>
                      <span className="font-medium">Dodaj Stanicu</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Floating "Live" badges or tooltips could be added here for more depth */}
        </div>
      </div>
    </section>
  );
}

