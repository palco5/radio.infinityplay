import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudio } from '../contexts/AudioContext';
import { localAuth, localStations } from '../lib/localStorage';
import { useEventBus, EVENTS } from '../lib/eventBus';
import { RadioStation } from '../types';
import { getGenreStyle } from '../lib/genreBackgrounds';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  Search,
  Filter,
  User,
  CreditCard,
  Settings,
  LogOut,
  Moon,
  Sun,
  Music,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProfileManagement from '../components/dashboard/ProfileManagement';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import SubscriptionManagement from '../components/dashboard/SubscriptionManagement';
import SettingsModal from '../components/dashboard/SettingsModal';
import TrialStatus from '../components/dashboard/TrialStatus';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStation, isPlaying, playStation, pause } = useAudio();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    fetchStations();
    if (user) {
      checkOnboardingStatus();
      checkAndShowConfetti();
    }
  }, [user, profile]);

  // Realtime sinhronizacija - osveži stanice kada admin izmeni
  useEventBus(EVENTS.STATION_CREATED, useCallback(() => {
    fetchStations();
  }, []));

  useEventBus(EVENTS.STATION_UPDATED, useCallback(() => {
    fetchStations();
  }, []));

  useEventBus(EVENTS.STATION_DELETED, useCallback(() => {
    fetchStations();
  }, []));

  // Osveži profil kada se izmeni
  useEventBus(EVENTS.USER_PROFILE_UPDATED, useCallback(({ userId }) => {
    if (userId === user?.id) {
      // Profil će se automatski osvežiti preko AuthContext
      window.location.reload(); // Privremeno rešenje
    }
  }, [user?.id]));

  const checkAndShowConfetti = async () => {
    if (!user || !profile) return;

    if (profile.subscription_tier && profile.subscription_tier !== 'free' && !profile.confetti_shown) {
      setTimeout(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const colors = ['#10b981', '#f97316', '#ffffff'];

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }, 500);

      localAuth.updateProfile(user.id, { confetti_shown: true });
    }
  };

  const checkOnboardingStatus = () => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
  };

  useEffect(() => {
    filterStations();
  }, [searchQuery, selectedGenre, stations]);

  const fetchStations = async () => {
    const data = localStations.getActive();
    const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

    setStations(sortedData);
    setFilteredStations(sortedData);
    setLoading(false);
  };



  const filterStations = () => {
    let filtered = [...stations];

    if (searchQuery) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedGenre !== 'all') {
      filtered = filtered.filter(station => station.genre === selectedGenre);
    }

    setFilteredStations(filtered);
  };

  const genres = Array.from(new Set(stations.map(s => s.genre)));

  const handleStationClick = (station: RadioStation) => {
    console.log('Station clicked:', station.name);
    try {
      if (currentStation?.id === station.id && isPlaying) {
        console.log('Pausing station');
        pause();
      } else {
        console.log('Playing station');
        playStation(station);
      }
    } catch (error) {
      console.error('Error in handleStationClick:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 transition-colors">
      <nav className="bg-white dark:bg-infinity-dark-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center space-x-2 md:space-x-3">
              <img src="logo.png" alt="InfinityPlay" className="h-8 md:h-10 w-auto" />
              <span className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white">
                Dashboard
              </span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="text-infinity-green-500" size={20} />
                ) : (
                  <Moon className="text-gray-700" size={20} />
                )}
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-2 md:space-x-3 px-2 md:px-4 py-1.5 md:py-2 bg-gray-100 dark:bg-infinity-dark-700 rounded-full hover:bg-gray-200 dark:hover:bg-infinity-dark-600 transition-colors"
              >
                {profile?.avatar_url ? (
                  <span className="text-xl md:text-2xl">{profile.avatar_url}</span>
                ) : (
                  <User size={18} className="text-gray-600 dark:text-gray-400 md:w-5 md:h-5" />
                )}
                <span className="text-xs md:text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
                  {profile?.display_name || user?.email?.split('@')[0]}
                </span>
              </button>

              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex">
                <LogOut size={16} className="mr-1" />
                Odjavi se
              </Button>
              <button
                onClick={handleSignOut}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
              >
                <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div >
        </div >
      </nav >

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <TrialStatus />
        </div>

        <div className="grid lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                  Dobrodošli nazad!
                </h1>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  Pronađite i slušajte svoje omiljene radio stanice
                </p>
              </div>
              {profile?.subscription_tier && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                  <span className="text-white text-sm md:text-base font-bold uppercase">{profile.subscription_tier}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-2xl p-4 text-white">
                <Music size={32} className="mb-2" />
                <p className="text-2xl font-bold">{stations.length}</p>
                <p className="text-sm opacity-90">Dostupnih stanica</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white">
                <Clock size={32} className="mb-2" />
                <p className="text-2xl font-bold">{profile?.total_listening_minutes || 0}</p>
                <p className="text-sm opacity-90">Minuta slušanja</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl p-4 text-white">
                <Play size={32} className="mb-2" />
                <p className="text-2xl font-bold">{currentStation ? '1' : '0'}</p>
                <p className="text-sm opacity-90">Aktivna stanica</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-base md:text-lg font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
              Brzi Pristup
            </h3>
            <div className="space-y-1.5 md:space-y-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors text-left"
              >
                <User className="text-infinity-green-600" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Moj Profil</span>
              </button>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors text-left"
              >
                <CreditCard className="text-infinity-green-600" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Pretplata</span>
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors text-left"
              >
                <Settings className="text-infinity-green-600" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Podešavanja</span>
              </button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white">
              Radio Stanice
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pretraži stanice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none w-full sm:w-64"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="all">Svi žanrovi</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Učitavanje stanica...</p>
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="text-center py-12">
              <Music className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400">Nije pronađena nijedna stanica</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStations.map((station) => {
                const isCurrentlyPlaying = currentStation?.id === station.id && isPlaying;

                return (
                  <div
                    key={station.id}
                    onClick={() => handleStationClick(station)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isCurrentlyPlaying
                      ? 'border-infinity-green-500 bg-infinity-green-50 dark:bg-infinity-green-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 hover:border-infinity-green-300 dark:hover:border-infinity-green-700'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${getGenreStyle(station.genre).gradient}`}></div>
                        <div className={`absolute inset-0 ${getGenreStyle(station.genre).pattern}`}></div>
                        <Music className="text-white relative z-10" size={24} />
                      </div>
                      <button className={`w-10 h-10 rounded-full flex items-center justify-center ${isCurrentlyPlaying
                        ? 'bg-infinity-green-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                        {isCurrentlyPlaying ? (
                          <Pause className="text-white" size={20} />
                        ) : (
                          <Play className="text-gray-700 dark:text-gray-300" size={20} />
                        )}
                      </button>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {station.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {station.genre}
                    </p>
                    {station.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                        {station.description}
                      </p>
                    )}
                    {station.recommended_for && station.recommended_for.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {station.recommended_for.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                        {station.recommended_for.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                            +{station.recommended_for.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {isCurrentlyPlaying && (
                      <div className="mt-2 flex items-center space-x-1">
                        <div className="w-1 h-3 bg-infinity-green-600 rounded-full animate-pulse"></div>
                        <div className="w-1 h-4 bg-infinity-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1 h-3 bg-infinity-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-xs text-infinity-green-600 ml-2">Svira</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <ProfileManagement
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <SubscriptionManagement
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
