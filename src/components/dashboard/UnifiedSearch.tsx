import { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Clock, Music, Radio } from 'lucide-react';
import { useSongPlayer, SongInfo } from '../../contexts/SongPlayerContext';
import { useAudio } from '../../contexts/AudioContext';
import { RadioStation } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  artist: { name: string };
  album: {
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    cover_xl: string;
  };
}

interface SongPlayModalProps {
  track: DeezerTrack;
  onPlayNow: () => void;
  onPlayAfter: () => void;
  onClose: () => void;
  canQueue: boolean;
}

function SongPlayModal({ track, onPlayNow, onPlayAfter, onClose, canQueue }: SongPlayModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-infinity-dark-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-4 mb-5">
          <img
            src={track.album.cover_big || track.album.cover_medium}
            alt={track.title}
            className="w-16 h-16 rounded-xl object-cover shadow-md flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 dark:text-white truncate text-base">{track.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{track.artist.name}</p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={onPlayNow}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-semibold"
          >
            <Play size={18} fill="currentColor" />
            <span>Pusti odmah</span>
          </button>
          {canQueue && (
            <button
              onClick={onPlayAfter}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold"
            >
              <Clock size={18} />
              <span>Pusti posle</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Otkaži
          </button>
        </div>
      </div>
    </div>
  );
}

async function searchDeezer(query: string): Promise<DeezerTrack[]> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const base = `${API_URL}/music_search.php?q=${encodeURIComponent(query)}`;

  const [r1, r2] = await Promise.allSettled([
    fetch(`${base}&page=0`, { headers }).then(r => r.json()),
    fetch(`${base}&page=1`, { headers }).then(r => r.json()),
  ]);

  const seen = new Set<number>();
  const merged: DeezerTrack[] = [];
  for (const r of [r1, r2]) {
    if (r.status !== 'fulfilled') continue;
    for (const item of (r.value.data || [])) {
      if (item.id && !seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  return merged;
}

interface UnifiedSearchProps {
  stations: RadioStation[];
  onStationClick: (station: RadioStation) => void;
}

export default function UnifiedSearch({ stations, onStationClick }: UnifiedSearchProps) {
  const [query, setQuery] = useState('');
  const [deezerResults, setDeezerResults] = useState<DeezerTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<DeezerTrack | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { playSong, queueSong, songState, setQueuedAction } = useSongPlayer();
  const { isPlaying, currentStation, playStation } = useAudio();

  const canQueue = (isPlaying && !!currentStation) || songState === 'playing' || songState === 'paused' || songState === 'queued';

  // Filter stations locally
  const filteredStations = query.trim().length > 0
    ? stations.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.genre && s.genre.toLowerCase().includes(query.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5)
    : [];

  // Deezer search with debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setDeezerResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchDeezer(query);
        setDeezerResults(data);
      } catch {
        setDeezerResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const buildSongInfo = (track: DeezerTrack): SongInfo => ({
    title: track.title,
    artist: track.artist.name,
    artwork: track.album.cover_big || track.album.cover_medium,
    youtubeQuery: `${track.title} ${track.artist.name}`,
    durationSeconds: track.duration,
  });

  const handlePlayNow = () => {
    if (!selectedTrack) return;
    const returnStation = (isPlaying && currentStation) ? currentStation : null;
    playSong(buildSongInfo(selectedTrack));
    // Set queuedAction AFTER playSong (playSong clears it first, then we set it)
    if (returnStation) {
      const station = returnStation;
      setQueuedAction(() => playStation(station));
    }
    setSelectedTrack(null);
    setQuery('');
    setDeezerResults([]);
    setShowDropdown(false);
  };

  const handlePlayAfter = () => {
    if (!selectedTrack) return;
    queueSong(buildSongInfo(selectedTrack));
    setSelectedTrack(null);
    setQuery('');
    setDeezerResults([]);
    setShowDropdown(false);
  };

  const handleStationPick = (station: RadioStation) => {
    setShowDropdown(false);
    setQuery('');
    onStationClick(station);
  };

  const hasResults = filteredStations.length > 0 || deezerResults.length > 0 || isSearching;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Pretraži stanicu ili pesmu..."
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => query && setShowDropdown(true)}
          className="pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none w-full"
          style={{ fontSize: '16px' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setDeezerResults([]); setShowDropdown(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && query && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-infinity-dark-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-40 overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Stations section */}
          {filteredStations.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-infinity-dark-700/50">
                Stanice
              </div>
              {filteredStations.map(station => (
                <button
                  key={station.id}
                  onClick={() => handleStationPick(station)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-infinity-dark-700 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  {station.logo_url ? (
                    <img src={station.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-infinity-green-100 dark:bg-infinity-green-900/30 flex items-center justify-center flex-shrink-0 text-base">
                      {station.icon_emoji || <Radio size={14} className="text-infinity-green-600" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{station.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{station.genre}</p>
                  </div>
                  <Radio size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Songs section */}
          {isSearching ? (
            <div className="flex items-center justify-center p-4 gap-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Pretraživanje pesama...</span>
            </div>
          ) : deezerResults.length > 0 ? (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-infinity-dark-700/50">
                Pesme
              </div>
              {deezerResults.map(track => (
                <button
                  key={track.id}
                  onClick={() => { setSelectedTrack(track); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-infinity-dark-700 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  <img
                    src={track.album.cover_small || track.album.cover_medium}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{track.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{track.artist.name}</p>
                  </div>
                  <Music size={13} className="text-violet-300 dark:text-violet-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Nema rezultata za „{query}"
            </div>
          ) : null}
        </div>
      )}

      {selectedTrack && (
        <SongPlayModal
          track={selectedTrack}
          onPlayNow={handlePlayNow}
          onPlayAfter={handlePlayAfter}
          onClose={() => setSelectedTrack(null)}
          canQueue={canQueue}
        />
      )}
    </div>
  );
}
