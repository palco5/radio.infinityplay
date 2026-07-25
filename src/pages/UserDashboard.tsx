import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudio } from '../contexts/AudioContext';
import { stations as stationsApi, profiles as profilesApi, jingles as jinglesApi } from '../lib/api';
import { useEventBus, EVENTS } from '../lib/eventBus';
import { RadioStation, UserProfile } from '../types';
import { useRemoteSession, RemoteDevice } from '../hooks/useRemoteSession';
import RemoteControlPanel from '../components/dashboard/RemoteControlPanel';
import SongMiniPlayer from '../components/dashboard/SongMiniPlayer';
import DJManagerOverlay from '../components/dashboard/DJManagerOverlay';
import HeroPlayer from '../components/dashboard/HeroPlayer';
import { useSongPlayer } from '../contexts/SongPlayerContext';

import confetti from 'canvas-confetti';
import {
  Play,
  Filter,
  User,
  LogOut,
  Moon,
  Sun,
  Music,
  Clock,
  Search,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import SettingsModal from '../components/dashboard/SettingsModal';
import TrialStatus from '../components/dashboard/TrialStatus';
import StationCard from '../components/StationCard';
import MojRadioCard from '../components/MojRadioCard';
import DashboardSelectionModal from '../components/dashboard/DashboardSelectionModal';
import { Shield } from 'lucide-react';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminViewUserId = searchParams.get('adminView');

  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStation, isPlaying, playStation, pause, updateJingles } = useAudio();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'account' | 'security' | 'billing' | 'notifications' | 'danger'>('account');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [adminViewProfile, setAdminViewProfile] = useState<UserProfile | null>(null);
  const [remoteSessions, setRemoteSessions] = useState<RemoteDevice[]>([]);
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [clickedStationId, setClickedStationId] = useState<string | null>(null);
  const [pendingStation, setPendingStation] = useState<RadioStation | null>(null);
  const [isDJOpen, setIsDJOpen] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const djButtonRef = useRef<HTMLButtonElement>(null);
  const heroSlotRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { songState, currentSong, stopSong, skipSong, setQueuedAction, pauseSong, resumeSong, playSong, queueSong, songQueue, postRadioQueue, savedPlaylist, saveCurrentQueueAs, clearSavedPlaylist, scheduleSwitch, resumeSavedPlaylist } = useSongPlayer();

  // Aktivan profil mora biti definisan pre remoteStations
  const activeProfile = adminViewUserId ? (adminViewProfile ?? null) : profile;
  const adminViewLoading = !!adminViewUserId && adminViewProfile === null;

  // Stations list for remote control (includes Moj Radio if available)
  const remoteStations = [
    ...(activeProfile?.my_radio_stream_url
      ? [{
          id: `moj-radio-${user?.id}`,
          name: 'Moj Radio',
          description: 'Personalni radio stream',
          genre: 'Personalni',
          logo_url: null,
          stream_url: activeProfile.my_radio_stream_url,
          medicp_id: null,
          bitrate: 128,
          is_featured: true,
          is_active: true,
          listener_count: 0,
          icon_url: null,
          icon_emoji: '📻',
          background_url: null,
          background_color: null,
          background_type: 'gradient' as const,
          grid_row: null,
          grid_column: null,
          grid_page: 1,
          recommended_for: [],
          created_at: '',
          updated_at: '',
        } as RadioStation]
      : []),
    ...stations,
  ];

  const { sendCommand: sendRemoteCommand, deviceType: myDeviceType } = useRemoteSession({
    enabled: !adminViewUserId && !!user,
    currentStation,
    isPlaying,
    songState,
    currentSong,
    songQueue,
    postRadioQueue,
    savedPlaylistCount: savedPlaylist.length,
    onPlayStation: (station) => {
      // Remote triggered immediate station switch — save playlist if song was active
      if (songState !== 'idle' && songState !== 'queued') {
        const all = currentSong ? [currentSong, ...songQueue] : [...songQueue];
        if (all.length > 0) saveCurrentQueueAs(all);
        stopSong();
        setTimeout(() => playStation(station), 1400);
      } else {
        playStation(station);
      }
    },
    onPause: pause,
    onResume: () => { if (currentStation) playStation(currentStation); },
    onSongPause: pauseSong,
    onSongResume: resumeSong,
    onSongStop: stopSong,
    onSongSkip: skipSong,
    onSongPlay: (song, immediate) => { if (immediate) playSong(song); else queueSong(song); },
    onScheduleSwitch: (keepInQueue, station) => scheduleSwitch(keepInQueue, () => playStation(station)),
    onResumeSaved: (immediate) => resumeSavedPlaylist(immediate),
    allStations: remoteStations,
    onSessionsChange: (sessions, deviceId) => {
      setRemoteSessions(sessions);
      setMyDeviceId(deviceId);
    },
  });

  // Sve funkcije koje se koriste u hookovima moraju biti definisane pre early returns
  const fetchStations = useCallback(async () => {
    try {
      const data = await stationsApi.getAll();
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
  }, []);

  const filterStations = useCallback(() => {
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
  }, [stations, searchQuery, selectedGenre]);

  const checkAndShowConfetti = useCallback(async () => {
    if (!user || !profile) return;
    if (profile.subscription_tier && profile.subscription_tier !== 'free' && !profile.confetti_shown) {
      setTimeout(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const colors = ['#10b981', '#f97316', '#ffffff'];
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < animationEnd) requestAnimationFrame(frame);
        };
        frame();
      }, 500);
      profilesApi.update(user.id, { confetti_shown: true });
    }
  }, [user, profile]);

  const checkOnboardingStatus = useCallback(() => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  // Kada admin gleda tuđi dashboard — učitaj taj profil
  useEffect(() => {
    if (adminViewUserId) {
      profilesApi.getById(adminViewUserId).then(setAdminViewProfile).catch(console.error);
    }
  }, [adminViewUserId]);

  useEffect(() => {
    fetchStations();
    if (user) {
      checkOnboardingStatus();
      checkAndShowConfetti();

      // Fetch and load jingles — in admin view, load the target user's jingles
      const jingleUserId = adminViewUserId || user.id;
      jinglesApi.getAll(jingleUserId).then(userJingles => {
        console.log('🎵 Loading jingles into AudioContext:', userJingles.length);
        updateJingles(userJingles);
      }).catch(err => console.error('Failed to load jingles:', err));
    }
  }, [user, profile, adminViewUserId]);

  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      const isTrial = profile.subscription_status === 'trial';
      const isActive = profile.subscription_status === 'active';

      // Expired trial stays on trial status but with past date — handled by isTrialExpired below
      // Only redirect if status is neither trial nor active (e.g. cancelled, unpaid)
      if (!isTrial && !isActive) {
        setIsRedirecting(true);
        navigate('/subscription-options', { replace: true });
      }
    }
  }, [profile, authLoading, navigate]);

  // Expiration check — runs immediately and then every minute
  useEffect(() => {
    if (!profile || profile.is_admin) return;

    const checkExpiry = () => {
      // Trial with expired date
      if (profile.subscription_status === 'trial' && profile.trial_ends_at) {
        const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
        if (diff <= 0) { setIsTrialExpired(true); return; }
      }
      // Subscription ended (active but past end date)
      if (profile.subscription_status === 'active' && profile.subscription_ends_at) {
        const diff = new Date(profile.subscription_ends_at).getTime() - Date.now();
        if (diff <= 0) { setIsTrialExpired(true); return; }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  // Realtime sinhronizacija — pre early returns (React pravila hookova)
  useEventBus(EVENTS.STATION_CREATED, fetchStations);
  useEventBus(EVENTS.STATION_UPDATED, fetchStations);
  useEventBus(EVENTS.STATION_DELETED, fetchStations);

  useEventBus(EVENTS.USER_PROFILE_UPDATED, useCallback(({ userId }: { userId: string }) => {
    if (user?.id && userId === user.id) {
      // Profil će se osvežiti kroz AuthContext — ne reloadujemo stranicu da ne bismo pravili loop
      fetchStations();
    }
  }, [user?.id, fetchStations]));

  // Filter stanica i clear click state — pre early returns
  useEffect(() => {
    filterStations();
  }, [filterStations]);

  useEffect(() => {
    if (isPlaying && currentStation?.id === clickedStationId) {
      setClickedStationId(null);
    }
  }, [isPlaying, currentStation?.id]);

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

  if (isTrialExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-infinity-dark-900 p-4">
        <div className="bg-white dark:bg-infinity-dark-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-2 bg-gradient-to-r from-red-500 to-orange-400" />

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="text-red-500" size={36} />
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white mb-3">
              Probni period je istekao
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm md:text-base leading-relaxed">
              Vaš besplatni probni period je završen. Kontaktirajte nas kako bismo aktivirali vaš nalog.
            </p>

            {/* Contact info */}
            <div className="bg-gray-50 dark:bg-infinity-dark-700 rounded-2xl p-5 mb-6 text-left space-y-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefon</p>
                <a
                  href="tel:+38169602902"
                  className="text-lg font-bold text-gray-900 dark:text-white hover:text-infinity-green-500 dark:hover:text-infinity-green-400 transition-colors"
                >
                  +381 69 602902
                </a>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <a
                  href="mailto:support@infinityplay.rs"
                  className="text-lg font-bold text-gray-900 dark:text-white hover:text-infinity-green-500 dark:hover:text-infinity-green-400 transition-colors"
                >
                  support@infinityplay.rs
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button fullWidth onClick={() => navigate('/subscription-options')} size="lg" className="font-bold">
                Pogledaj Pakete
              </Button>
              <a
                href="mailto:support@infinityplay.rs"
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-center"
              >
                Pošalji Email
              </a>
              <button
                onClick={handleSignOut}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                Odjavi se
              </button>
            </div>
          </div>
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

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
  };

  const genres = Array.from(new Set(stations.map(s => s.genre)));

  const mojRadioStation: RadioStation | null = activeProfile?.my_radio_stream_url
    ? {
        id: `moj-radio-${user?.id}`,
        name: 'Moj Radio',
        description: activeProfile.display_name ? `${activeProfile.display_name} — personalni stream` : 'Personalni radio stream',
        genre: 'Personalni',
        logo_url: null,
        stream_url: activeProfile.my_radio_stream_url,
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
    if (songState !== 'idle') {
      setPendingStation(mojRadioStation);
      return;
    }
    if (isMojRadioPlaying) {
      pause();
      setClickedStationId(null);
    } else {
      setClickedStationId(mojRadioStation.id);
      playStation(mojRadioStation);
    }
  };


  const getStationOriginEl = () => {
    const id = currentStation?.id;
    return id ? stationRefs.current.get(id) ?? null : null;
  };
  const getDjOriginEl = () => djButtonRef.current;

  const handleStationClick = (station: RadioStation) => {
    if (songState !== 'idle') {
      setPendingStation(station);
      return;
    }
    if (currentStation?.id === station.id && isPlaying) {
      pause();
      setClickedStationId(null);
    } else {
      setClickedStationId(station.id);
      playStation(station);
    }
  };


  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 transition-colors overflow-x-hidden">
      {/* Admin pregled banner */}
      {adminViewUserId && (
        <div className="bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
          <Shield size={16} />
          {adminViewLoading ? (
            <span>Admin pregled — učitavanje profila...</span>
          ) : (
            <span>
              Admin pregled — <strong>{adminViewProfile?.display_name || adminViewProfile?.email || '?'}</strong>
              {adminViewProfile?.display_name && adminViewProfile?.email && ` (${adminViewProfile.email})`}
            </span>
          )}
          <button
            onClick={() => window.close()}
            className="ml-4 px-2 py-0.5 bg-amber-900/20 hover:bg-amber-900/30 rounded text-xs transition-colors"
          >
            Zatvori tab
          </button>
        </div>
      )}
      <nav className="bg-white dark:bg-infinity-dark-800 border-b border-gray-200 dark:border-gray-700">
        {/* Mobile header (phone only) — unchanged */}
        <div className="container mx-auto px-4 md:hidden">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => { pause(); navigate('/'); }}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img src="logo.png" alt="InfinityPlay" className="h-8 w-auto" />
              <span className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                Dashboard
              </span>
            </button>

            <div className="flex items-center space-x-2">
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
                onClick={() => { if (!adminViewUserId) { setSettingsInitialTab('account'); setShowSettingsModal(true); } }}
                className={`flex items-center space-x-2 px-2 py-1.5 bg-gray-100 dark:bg-infinity-dark-700 rounded-full transition-colors ${adminViewUserId ? 'cursor-default' : 'hover:bg-gray-200 dark:hover:bg-infinity-dark-600'}`}
              >
                {activeProfile?.avatar_url ? (
                  <span className="text-xl">{activeProfile.avatar_url}</span>
                ) : (
                  <User size={18} className="text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-900 dark:text-white hidden sm:inline">
                  {activeProfile?.venue_name || activeProfile?.display_name || user?.email?.split('@')[0]}
                </span>
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
              >
                <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              {user?.email === 'darkospira@gmail.com' && (
                <button
                  onClick={() => setShowDashboardSelector(true)}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={18} className="text-red-600 dark:text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tablet/desktop header */}
        <div className="hidden md:block container mx-auto px-4">
          <div className="grid grid-cols-3 items-center h-20">
            <div className="flex items-center space-x-4 justify-self-start">
              <button
                onClick={() => { if (!adminViewUserId) { setSettingsInitialTab('account'); setShowSettingsModal(true); } }}
                className={`text-base font-semibold text-gray-900 dark:text-white transition-opacity ${adminViewUserId ? 'cursor-default' : 'hover:opacity-70'}`}
              >
                {activeProfile?.venue_name || activeProfile?.display_name || user?.email?.split('@')[0]}
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={() => { setSettingsInitialTab('account'); setShowSettingsModal(true); }}
                className="text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Podešavanja
              </button>
            </div>

            <button
              onClick={() => { pause(); navigate('/'); }}
              className="justify-self-center hover:opacity-80 transition-opacity"
            >
              <img src="logo.png" alt="InfinityPlay" className="h-10 w-auto" />
            </button>

            <div className="flex items-center space-x-4 justify-self-end">
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
              {user?.email === 'darkospira@gmail.com' && (
                <button
                  onClick={() => setShowDashboardSelector(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={15} />
                  <span>Admin</span>
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-1" />
                Odjavi se
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <TrialStatus />
        </div>

        <div ref={heroSlotRef} />

        <Card>
          {/* 1. Moj Radio — na vrhu */}
          {mojRadioStation && (
            <div
              className="mb-4"
              ref={(el) => { if (el) stationRefs.current.set(mojRadioStation.id, el); else stationRefs.current.delete(mojRadioStation.id); }}
            >
              <MojRadioCard
                isPlaying={isMojRadioPlaying}
                onClick={handleMojRadioClick}
                displayName={activeProfile?.display_name}
              />
            </div>
          )}

          {/* 2. Daljinski upravljač */}
          {!adminViewUserId && (
            <div className="mb-4">
              <RemoteControlPanel
                devices={remoteSessions}
                myDeviceType={myDeviceType}
                stations={remoteStations}
                onSendCommand={sendRemoteCommand}
              />
            </div>
          )}

          {/* 3. Saved playlist resume card */}
          {savedPlaylist.length > 0 && (
            <div className="mb-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Music size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Sačuvana playlista</p>
                <p className="text-xs text-violet-600 dark:text-violet-400">{savedPlaylist.length} {savedPlaylist.length === 1 ? 'pesma' : 'pesme'}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowResumeModal(true)}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors active:scale-95"
                >
                  Nastavi
                </button>
                <button
                  onClick={clearSavedPlaylist}
                  className="px-2 py-1.5 text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                  title="Obriši sačuvanu playlistu"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* 4. Song mini player */}
          <SongMiniPlayer />

          {/* 4. DJ Manager card + search */}
          <div className="mb-4 md:mb-6">
            {/* DJ Manager card-style button */}
            <button
              ref={djButtonRef}
              onClick={() => setIsDJOpen(true)}
              className="relative w-full cursor-pointer rounded-2xl overflow-hidden mb-3 select-none group text-left active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #0f0a1e 0%, #1e0a3c 55%, #0f172a 100%)',
                border: '1px solid rgba(124,58,237,0.22)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)',
                transition: 'box-shadow 0.35s ease, transform 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.22), 0 0 28px rgba(124,58,237,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)'; }}
            >
              {/* Ambient left glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(124,58,237,0.14) 0%, transparent 60%)' }}
              />

              <div className="relative flex items-center gap-4 sm:gap-6 px-4 py-4 sm:px-6 sm:py-5">
                {/* Left: text */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">DJ Manager</h2>
                  <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgba(196,181,253,0.65)' }}>
                    Budi svoj DJ, pusti pesme koje ti želiš
                  </p>
                  <div className="mt-2 flex items-end gap-[3px] h-5" aria-hidden>
                    {[4, 7, 5, 9, 6, 8, 4, 7, 5, 6, 8, 5].map((h, i) => (
                      <div key={i} style={{ width: 3, height: `${h * 2}px`, borderRadius: 2, background: 'rgba(124,58,237,0.5)', flexShrink: 0 }} />
                    ))}
                  </div>
                </div>

                {/* Right: DJ with headphones illustration */}
                <div style={{ flexShrink: 0 }}>
                  <svg viewBox="0 0 80 80" width="80" height="80">
                    {/* Background glow */}
                    <circle cx="40" cy="40" r="36" fill="rgba(88,28,135,0.18)" />
                    {/* Shoulders */}
                    <ellipse cx="40" cy="80" rx="24" ry="13" fill="rgba(109,40,217,0.28)" />
                    {/* Neck */}
                    <rect x="34" y="59" width="12" height="10" rx="4" fill="rgba(109,40,217,0.22)" />
                    {/* Head */}
                    <circle cx="40" cy="44" r="18" fill="rgba(67,20,100,0.45)" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
                    {/* Eyes — cool closed look */}
                    <path d="M 33 43 Q 35.5 41 38 43" stroke="rgba(216,180,254,0.9)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M 42 43 Q 44.5 41 47 43" stroke="rgba(216,180,254,0.9)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    {/* Smirk */}
                    <path d="M 35 50 Q 41 55 47 51" stroke="rgba(196,181,253,0.65)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Headphone band */}
                    <path d="M 23 40 Q 23 18 40 18 Q 57 18 57 40" stroke="rgba(167,139,250,0.9)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    {/* Left ear cup */}
                    <rect x="15" y="34" width="11" height="16" rx="5.5" fill="rgba(109,40,217,0.75)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" />
                    <circle cx="20.5" cy="42" r="3" fill="rgba(167,139,250,0.12)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.8" />
                    {/* Right ear cup */}
                    <rect x="54" y="34" width="11" height="16" rx="5.5" fill="rgba(109,40,217,0.75)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" />
                    <circle cx="59.5" cy="42" r="3" fill="rgba(167,139,250,0.12)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.8" />
                    {/* Floating eighth note */}
                    <circle cx="66" cy="14" r="3.5" fill="rgba(196,181,253,0.3)" />
                    <line x1="69.5" y1="14" x2="69.5" y2="5" stroke="rgba(196,181,253,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="69.5" y1="5" x2="74" y2="7.5" stroke="rgba(196,181,253,0.3)" strokeWidth="1.3" strokeLinecap="round" />
                    {/* Sparkle dots */}
                    <circle cx="11" cy="22" r="1.8" fill="rgba(167,139,250,0.3)" />
                    <circle cx="7" cy="32" r="1.2" fill="rgba(167,139,250,0.2)" />
                    <circle cx="72" cy="57" r="1.5" fill="rgba(167,139,250,0.25)" />
                    <circle cx="76" cy="45" r="1" fill="rgba(167,139,250,0.2)" />
                  </svg>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)', opacity: 0.45 }}
              />
            </button>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  placeholder="Pretraži stanicu..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none w-full"
                  style={{ fontSize: '16px' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="relative flex-shrink-0">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none appearance-none cursor-pointer max-w-[140px]"
                  style={{ fontSize: '16px' }}
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
                const isCurrentlyPlaying =
                  (currentStation?.id === station.id && isPlaying) ||
                  clickedStationId === station.id;

                return (
                  <div
                    key={station.id}
                    ref={(el) => { if (el) stationRefs.current.set(station.id, el); else stationRefs.current.delete(station.id); }}
                  >
                    <StationCard
                      station={station}
                      isCurrentlyPlaying={isCurrentlyPlaying}
                      onClick={handleStationClick}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsInitialTab}
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

      <DJManagerOverlay
        isOpen={isDJOpen}
        onClose={() => setIsDJOpen(false)}
        remoteSessions={remoteSessions}
        sendRemoteCommand={sendRemoteCommand}
        buttonRef={djButtonRef}
      />

      <HeroPlayer
        heroSlotRef={heroSlotRef}
        getStationOriginEl={getStationOriginEl}
        getDjOriginEl={getDjOriginEl}
      />

      {/* Station intercept modal — shown when song is playing and user picks a station */}
      {pendingStation && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPendingStation(null)}
        >
          <div
            className="bg-white dark:bg-infinity-dark-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-infinity rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                {pendingStation.icon_emoji || '📻'}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{pendingStation.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kada prebaciti stanicu?</p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const s = pendingStation;
                  const all = currentSong ? [currentSong, ...songQueue] : [...songQueue];
                  if (all.length > 0) saveCurrentQueueAs(all);
                  setPendingStation(null);
                  stopSong();
                  setTimeout(() => { setClickedStationId(s.id); playStation(s); }, 1400);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-infinity-green-500 hover:bg-infinity-green-600 text-white rounded-xl transition-colors font-semibold"
              >
                <Play size={18} fill="currentColor" />
                <span>Odmah</span>
              </button>
              <button
                onClick={() => {
                  const s = pendingStation;
                  setPendingStation(null);
                  // scheduleSwitch(0) saves entire queue and clears it, then fires action after current song
                  scheduleSwitch(0, () => { setClickedStationId(s.id); playStation(s); });
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold"
              >
                <Clock size={18} />
                <span>Nakon ove pesme</span>
              </button>
              {songQueue.length >= 1 && (
                <button
                  onClick={() => {
                    const s = pendingStation;
                    setPendingStation(null);
                    scheduleSwitch(1, () => { setClickedStationId(s.id); playStation(s); });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold"
                >
                  <Clock size={18} />
                  <span>Nakon još 2 pesme</span>
                </button>
              )}
              {songQueue.length >= 2 && (
                <button
                  onClick={() => {
                    const s = pendingStation;
                    setPendingStation(null);
                    scheduleSwitch(2, () => { setClickedStationId(s.id); playStation(s); });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold"
                >
                  <Clock size={18} />
                  <span>Nakon još 3 pesme</span>
                </button>
              )}
              <button
                onClick={() => setPendingStation(null)}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume saved playlist modal */}
      {showResumeModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowResumeModal(false)}
        >
          <div
            className="bg-white dark:bg-infinity-dark-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Nastavi playlistu</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{savedPlaylist.length} {savedPlaylist.length === 1 ? 'pesma' : 'pesme'} sačuvano</p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => { setShowResumeModal(false); resumeSavedPlaylist(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-semibold"
              >
                <Play size={18} fill="currentColor" />
                <span>Odmah</span>
              </button>
              <button
                onClick={() => { setShowResumeModal(false); resumeSavedPlaylist(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold"
              >
                <Clock size={18} />
                <span>Nakon ove pesme / ICY promene</span>
              </button>
              <button
                onClick={() => setShowResumeModal(false)}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
