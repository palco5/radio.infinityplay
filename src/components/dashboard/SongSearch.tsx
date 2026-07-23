import { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Clock, Music } from 'lucide-react';
import { useSongPlayer, SongInfo } from '../../contexts/SongPlayerContext';
import { useAudio } from '../../contexts/AudioContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface DeezerTrack {
  id: number;
  title: string;
  duration: number; // seconds
  artist: { name: string };
  album: {
    cover_small: string;  // 56x56
    cover_medium: string; // 250x250
    cover_big: string;    // 500x500
    cover_xl: string;     // 1000x1000
  };
}

interface PlayModalProps {
  title: string;
  artist: string;
  artwork: string;
  onPlayNow: () => void;
  onPlayAfter: () => void;
  onClose: () => void;
  canQueue: boolean;
}

function PlayModal({ title, artist, artwork, onPlayNow, onPlayAfter, onClose, canQueue }: PlayModalProps) {
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
          <img src={artwork} alt={title} className="w-16 h-16 rounded-xl object-cover shadow-md flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 dark:text-white truncate text-base">{title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{artist}</p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={onPlayNow}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-infinity-green-500 hover:bg-infinity-green-600 text-white rounded-xl transition-colors font-semibold"
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
              <span>Pusti posle ove pesme</span>
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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

export default function SongSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<DeezerTrack | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { playSong, queueSong, songState } = useSongPlayer();
  const { isPlaying, currentStation } = useAudio();

  const canQueue = (isPlaying && !!currentStation) || songState === 'playing' || songState === 'paused';


  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setResults([]); setShowResults(false); setIsSearching(false); return; }

    setIsSearching(true);
    setShowResults(true);

    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchDeezer(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowResults(false);
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
    if (!selected) return;
    playSong(buildSongInfo(selected));
    setSelected(null); setQuery(''); setResults([]);
  };

  const handlePlayAfter = () => {
    if (!selected) return;
    queueSong(buildSongInfo(selected));
    setSelected(null); setQuery(''); setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" size={18} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Pretraži pesmu po imenu ili izvođaču..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-9 pr-9 py-2.5 border border-violet-300 dark:border-violet-700 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none w-full"
          style={{ fontSize: '16px' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-infinity-dark-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-40 overflow-hidden">
          {isSearching ? (
            <div className="flex items-center justify-center p-5 gap-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Pretraživanje...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-5 text-center text-sm text-gray-500 dark:text-gray-400">
              Nije pronađena nijedna pesma
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              {results.map(track => (
                <button
                  key={track.id}
                  onClick={() => { setSelected(track); setShowResults(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-infinity-dark-700 transition-colors text-left"
                >
                  <img
                    src={track.album.cover_small || track.album.cover_medium}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{track.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{track.artist.name}</p>
                  </div>
                  <Play size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <PlayModal
          title={selected.title}
          artist={selected.artist.name}
          artwork={selected.album.cover_big || selected.album.cover_medium}
          onPlayNow={handlePlayNow}
          onPlayAfter={handlePlayAfter}
          onClose={() => setSelected(null)}
          canQueue={canQueue}
        />
      )}
    </div>
  );
}
