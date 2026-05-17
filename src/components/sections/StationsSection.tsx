import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { stations as stationsApi } from '../../lib/api';
import { RadioStation } from '../../types';
import { getGenreStyle } from '../../lib/genreBackgrounds';

export default function StationsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredStations, setFeaturedStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const allStations = await stationsApi.getAll();
        const featured = allStations.filter((s: RadioStation) => s.is_featured && s.is_active);
        setFeaturedStations(featured.slice(0, 6)); // Show max 6 featured stations
      } catch (error) {
        console.error('Failed to fetch stations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  const handleStationClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      // Directly open auth modal for registration
      window.dispatchEvent(new CustomEvent('OPEN_AUTH_MODAL', { detail: { defaultTab: 'register' } }));
    }
  };

  if (loading) {
    return <div className="py-20 text-center">Učitavanje stanica...</div>;
  }

  if (featuredStations.length === 0) {
    return null; // Don't show section if no featured stations
  }

  return (
    <section id="stations" className="py-12 md:py-20 bg-white dark:bg-[#0F172A] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Neke od naših radio stanica
          </h2>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Pogledajte deo naše ekskluzivne ponude. Prijavite se za potpuni doživljaj.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-6xl mx-auto">
          {featuredStations.map((station) => {
            const style = getGenreStyle(station.genre);

            return (
              <Card
                key={station.id}
                hover
                className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2"
              >
                <div
                  onClick={() => handleStationClick()}
                  className="relative"
                >
                  <div className="w-full h-48 rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden shadow-lg">
                    <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`}></div>
                    <div className={`absolute inset-0 ${style.pattern} opacity-50`}></div>

                    {station.logo_url ? (
                      <img src={station.logo_url} alt={`${station.name} - Online Radio Stanica`} className="w-full h-full object-cover relative z-10" />
                    ) : (
                      <span className="text-6xl relative z-10 filter drop-shadow-lg">{station.icon_emoji || '🎵'}</span>
                    )}

                    {!user && (
                      <div className="absolute top-3 right-3 bg-white/90 rounded-full p-2 z-20 shadow-sm">
                        <Lock size={16} className="text-gray-700" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2 truncate">
                    {station.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm h-10">
                    {station.description || 'Najbolja muzika za vaše poslovanje.'}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-roboto text-infinity-green-600 font-medium px-2 py-1 bg-infinity-green-50 dark:bg-infinity-green-900/30 rounded-lg">
                      {station.genre}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="group-hover:translate-x-1 transition-transform w-10 h-10 p-0 rounded-full flex items-center justify-center"
                    >
                      <Play size={18} className="fill-current" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
