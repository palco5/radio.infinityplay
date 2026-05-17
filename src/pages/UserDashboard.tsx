import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudio } from '../contexts/AudioContext';
import { stations as stationsApi, profiles as profilesApi, jingles as jinglesApi } from '../lib/api';
import { useEventBus, EVENTS } from '../lib/eventBus';
import { RadioStation } from '../types';

import confetti from 'canvas-confetti';
import {
  Search,
  Play,
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
import StationCard from '../components/StationCard';
import MojRadioCard from '../components/MojRadioCard';
import DashboardSelectionModal from '../components/dashboard/DashboardSelectionModal';
import { Shield } from 'lucide-react';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStation, isPlaying, playStation, pause, updateJingles } = useAudio();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    fetchStations();
    if (user) {
      checkOnboardingStatus();
      checkAndShowConfetti();

      // Fetch and load jingles
      jinglesApi.getAll(user.id).then(userJingles => {
        console.log('🎵 Loading jingles into AudioContext:', userJingles.length);
        updateJingles(userJingles);
      }).catch(err => console.error('Failed to load jingles:', err));
    }
  }, [user, profile]);

  useEffect(() => {
    // Wait until auth is NO LONGER loading and we have a profile
    if (!authLoading && profile && !profile.is_admin) {
      const isTrial = profile.subscription_status === 'trial';
      const isActive = profile.subscription_status === 'active';

      // If not active and not trial, redirect to subscription options
      if (!isTrial && !isActive) {
        setIsRedirecting(true);
        navigate('/subscription-options', { replace: true });
      }
    }
  }, [profile, authLoading, navigate]);

  // Self-healing: Fix trial dates if they are incorrectly set to 30 days
  useEffect(() => {
    if (profile && profile.subscription_status === 'trial' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      const now = new Date();
      const diffDays = (trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24);

      // If trial ends in more than 14 days, it's definitely wrong (should be 7)
      if (diffDays > 14) {
        console.log('Fixing incorrect trial date...');
        const newEndDate = new Date();
        // If we have start date, calculate 7 days from start. Otherwise 7 days from now.
        if (profile.trial_started_at) {
          const startDate = new Date(profile.trial_started_at);
          newEndDate.setTime(startDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        } else {
          newEndDate.setDate(newEndDate.getDate() + 7);
        }

        profilesApi.update(user!.id, {
          trial_ends_at: newEndDate.toISOString(),
          subscription_ends_at: newEndDate.toISOString()
        }).then(() => {
          window.location.reload(); // Reload to reflect changes
        }).catch(err => console.error('Failed to fix trial date', err));
      }
    }
  }, [profile, user]);

  // Timer and expiration check
  useEffect(() => {
    if (profile?.subscription_status === 'trial' && profile.trial_ends_at) {
      const updateTimer = () => {
        const end = new Date(profile.trial_ends_at!);
        const now = new Date();
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
          setIsTrialExpired(true);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [profile]);

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-infinity-dark-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Učitavanje profila...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-infinity-dark-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Preusmeravanje na pakete...</p>
        </div>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all duration-500">
        <div className="bg-white dark:bg-infinity-dark-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl border-2 border-red-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="text-red-500" size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white font-serif">Probni period je istekao!</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300 text-lg">
            Vaše vreme za besplatno korišćenje je isteklo.
            <br />
            <span className="text-sm opacity-75">Kontaktirajte nas za nastavak.</span>
          </p>

          <div className="bg-gray-50 dark:bg-infinity-dark-700 p-5 rounded-xl mb-8 text-left border border-gray-100 dark:border-gray-700">
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Kontakt telefon</p>
              <a href="tel:+381600000000" className="font-bold text-gray-900 dark:text-white text-xl hover:text-infinity-green-500 transition-colors">+381 60 000 0000</a>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Email podrška</p>
              <a href="mailto:info@infinityplay.rs" className="font-bold text-gray-900 dark:text-white text-xl hover:text-infinity-green-500 transition-colors">info@infinityplay.rs</a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => navigate('/subscription')} size="lg" className="font-bold text-lg">
              Pogledaj Pakete
            </Button>
            <Button variant="ghost" fullWidth onClick={() => window.location.href = 'mailto:info@infinityplay.rs'}>
              Pošalji Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      profilesApi.update(user.id, { confetti_shown: true });
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
    try {
      const data = await stationsApi.getAll();
      // Filter active stations and sort by name
      const activeStations = data
        .filter((s: RadioStation) => s.is_active)
        .sort((a: RadioStation, b: RadioStation) => a.name.localeCompare(b.name));

      setStations(activeStations);
      setFilteredStations(activeStations);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
    } finally {
      setLoading(false);
    }
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

  const mojRadioStation: RadioStation | null = profile?.my_radio_stream_url
    ? {
        id: `moj-radio-${user?.id}`,
        name: 'Moj Radio',
        description: profile.display_name ? `${profile.display_name} — personalni stream` : 'Personalni radio stream',
        genre: 'Personalni',
        logo_url: null,
        stream_url: profile.my_radio_stream_url,
        medicp_id: null,
        bitrate: 128,
        is_featured: true,
        is_active: true,
        listener_count: 0,
        icon_url: null,
        icon_emoji: '📻',
        background_url: null,
        background_color: null,
        background_type: 'gradient',
        grid_row: null,
        grid_column: null,
        grid_page: 1,
        recommended_for: [],
        created_at: '',
        updated_at: '',
      }
    : null;

  const isMojRadioPlaying = mojRadioStation
    ? currentStation?.id === mojRadioStation.id && isPlaying
    : false;

  const handleMojRadioClick = () => {
    if (!mojRadioStation) return;
    if (isMojRadioPlaying) {
      pause();
    } else {
      playStation(mojRadioStation);
    }
  };

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
      <nav className="bg-white dark:bg-infinity-dark-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button
              onClick={() => { pause(); navigate('/'); }}
              className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity"
            >
              <img src="logo.png" alt="InfinityPlay" className="h-8 md:h-10 w-auto" />
              <span className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white">
                Dashboard
              </span>
            </button>

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
              {user?.email === 'darkospira@gmail.com' && (
                <button
                  onClick={() => setShowDashboardSelector(true)}
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={15} />
                  <span>Admin</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
              >
                <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              {user?.email === 'darkospira@gmail.com' && (
                <button
                  onClick={() => setShowDashboardSelector(true)}
                  className="md:hidden p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={18} className="text-red-600 dark:text-red-400" />
                </button>
              )}
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
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                    <span className="text-white text-sm md:text-base font-bold uppercase">
                      {profile.subscription_status === 'trial' ? 'PROBNI PAKET' : profile.subscription_tier}
                    </span>
                  </div>
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

          {/* Moj Radio — prikazan uvek na vrhu ako admin postavi stream */}
          {mojRadioStation && (
            <MojRadioCard
              isPlaying={isMojRadioPlaying}
              onClick={handleMojRadioClick}
              displayName={profile?.display_name}
            />
          )}

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
                  <StationCard
                    key={station.id}
                    station={station}
                    isCurrentlyPlaying={isCurrentlyPlaying}
                    onClick={handleStationClick}
                  />
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
      <DashboardSelectionModal
        isOpen={showDashboardSelector}
        onClose={() => setShowDashboardSelector(false)}
      />
    </div>
  );
}
