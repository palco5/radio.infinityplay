import { useState } from 'react';
import { Music, Play, Pause, Lock, Guitar, Coffee, Zap, Wind } from 'lucide-react';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useAudio } from '../../contexts/AudioContext';

import { getGenreStyle } from '../../lib/genreBackgrounds';

const demoStations = [
  {
    id: 'demo-pop',
    name: 'Pop Hits',
    description: 'Najnoviji pop hitovi i klasici',
    genre: 'Pop',
    icon: Music,
    color: 'from-pink-500 to-purple-500',
    stream_url: 'https://stream.example.com/pop',
  },
  {
    id: 'demo-rock',
    name: 'Rock Legends',
    description: 'Rock leggende i savremeni alternative',
    genre: 'Rock',
    icon: Guitar,
    color: 'from-red-500 to-orange-500',
    stream_url: 'https://stream.example.com/rock',
  },
  {
    id: 'demo-jazz',
    name: 'Jazz Lounge',
    description: 'Smooth jazz za opuštenu atmosferu',
    genre: 'Jazz',
    icon: Coffee,
    color: 'from-amber-600 to-orange-700',
    stream_url: 'http://stream.srg-ssr.ch/m/rsj/mp3_128',
  },
  {
    id: 'demo-electronic',
    name: 'Electronic Vibes',
    description: 'Elektronska muzika za energiju',
    genre: 'Electronic',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    stream_url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'demo-chill',
    name: 'Chill Out',
    description: 'Opuštajuće melodije za relaksaciju',
    genre: 'Chill',
    icon: Wind,
    color: 'from-green-500 to-teal-500',
    stream_url: 'https://stream.example.com/chill',
  },
];

export default function StationsSection() {
  const { user } = useAuth();
  const { currentStation, isPlaying, playStation, pause } = useAudio();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<typeof demoStations[0] | null>(null);



  const handleStationClick = (station: typeof demoStations[0]) => {
    if (!user) {
      setSelectedStation(station);
      setShowAuthModal(true);
      return;
    }

    const stationData = {
      id: station.id,
      name: station.name,
      description: station.description || '',
      genre: station.genre,
      logo_url: null,
      stream_url: station.stream_url,
      medicp_id: null,
      bitrate: 320,
      is_featured: false,
      is_active: true,
      listener_count: 0,
      icon_url: null,
      icon_emoji: '🎵',
      background_url: null,
      background_color: null,
      background_type: 'solid' as const,
      grid_row: null,
      grid_column: null,
      grid_page: 1,
      recommended_for: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (currentStation?.id === station.id && isPlaying) {
      pause();
    } else {
      playStation(stationData);
    }
  };

  const scrollToPricing = () => {
    setShowAuthModal(false);
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="stations" className="py-20 bg-white dark:bg-infinity-dark-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Neke od naših radio stanica
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Pogledajte samo deo naše bogate ponude - dosta više radio stanica vas čeka nakon prijave
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {demoStations.map((station) => {
            const Icon = station.icon;
            const isCurrentlyPlaying = currentStation?.id === station.id && isPlaying;

            return (
              <Card
                key={station.id}
                hover
                glow={isCurrentlyPlaying}
                className="group cursor-pointer"
              >
                <div
                  onClick={() => handleStationClick(station)}
                  className="relative"
                >
                  <div className="w-full h-48 rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGenreStyle(station.genre).gradient}`}></div>
                    <div className={`absolute inset-0 ${getGenreStyle(station.genre).pattern}`}></div>
                    {isCurrentlyPlaying && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                    )}
                    <Icon className="text-white relative z-10" size={64} />
                    {isCurrentlyPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-16 h-16 border-4 border-white/50 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {!user && (
                      <div className="absolute top-3 right-3 bg-white/90 rounded-full p-2 z-20">
                        <Lock size={16} className="text-gray-700" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                    {station.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {station.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-roboto text-infinity-green-600 font-medium">
                      {station.genre}
                    </span>
                    <Button
                      variant={isCurrentlyPlaying ? 'secondary' : 'primary'}
                      size="sm"
                    >
                      {isCurrentlyPlaying ? (
                        <>
                          <Pause size={16} className="mr-1" />
                          Pauziraj
                        </>
                      ) : (
                        <>
                          <Play size={16} className="mr-1" />
                          Slušaj
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Prijavi se za slušanje"
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
            Registruj se kako bi slušao
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Prijavi se ili registruj kako bi slušao <strong>{selectedStation?.name}</strong> i otključao još ekskluzivnog sadržaja.
          </p>
          <p className="text-infinity-green-600 font-bold text-lg mb-6">
            Probaj besplatno 7 dana!
          </p>
          <Button variant="primary" size="lg" fullWidth onClick={scrollToPricing}>
            Pogledaj Pakete
          </Button>
        </div>
      </Modal>
    </section>
  );
}
