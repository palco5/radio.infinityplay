import { useEffect, useRef, useState } from 'react';
import { Search, X, Play, Plus, GripVertical, Music } from 'lucide-react';
import { useSongPlayer, SongInfo } from '../../contexts/SongPlayerContext';

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

const buildSongInfo = (track: DeezerTrack): SongInfo => ({
  title: track.title,
  artist: track.artist.name,
  artwork: track.album.cover_big || track.album.cover_medium,
  youtubeQuery: `${track.title} ${track.artist.name}`,
  durationSeconds: track.duration,
});

// Companion playlist panel shown inside the hero player while a DJ Manager
// song is playing — search + play/queue, plus drag-to-reorder on the queue
// (mirrors the pointer-based drag implementation in DJManagerOverlay, which
// doesn't share a component with this one but keeps the exact same
// interaction so it feels consistent).
export default function PlaylistPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragStateRef = useRef<{ from: number; to: number } | null>(null);
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const draggableItemsRef = useRef<SongInfo[]>([]);
  const reorderQueueRef = useRef<(newFlatOrder: SongInfo[]) => void>(() => {});
  const [, forceUpdate] = useState(0);

  const { playSong, queueSong, songState, currentSong, songQueue, postRadioQueue, reorderQueue } = useSongPlayer();

  const draggableItems = [...songQueue, ...postRadioQueue];
  draggableItemsRef.current = draggableItems;
  reorderQueueRef.current = reorderQueue;

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchDeezer(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  const handlePlayNow = (track: DeezerTrack) => {
    playSong(buildSongInfo(track));
    setQuery(''); setResults([]);
  };

  const handleAddToQueue = (track: DeezerTrack) => {
    queueSong(buildSongInfo(track));
    setQuery(''); setResults([]);
  };

  const handleGripPointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { from: index, to: index };
    forceUpdate(n => n + 1);

    const handleMove = (ev: PointerEvent) => {
      if (!dragStateRef.current) return;
      const y = ev.clientY;
      const n = draggableItemsRef.current.length;
      let newTo = n - 1;
      for (let i = 0; i < n; i++) {
        const el = itemEls.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) { newTo = i; break; }
      }
      if (newTo !== dragStateRef.current.to) {
        dragStateRef.current = { ...dragStateRef.current, to: newTo };
        forceUpdate(n => n + 1);
      }
    };

    const handleUp = () => {
      const ds = dragStateRef.current;
      if (ds && ds.from !== ds.to) {
        const arr = [...draggableItemsRef.current];
        const [moved] = arr.splice(ds.from, 1);
        arr.splice(ds.to, 0, moved);
        reorderQueueRef.current(arr);
      }
      dragStateRef.current = null;
      forceUpdate(n => n + 1);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
  };

  const ds = dragStateRef.current;
  const draggedSong = ds !== null ? draggableItems[ds.from] : null;
  const displayDraggable = (() => {
    if (!ds || ds.from === ds.to) return draggableItems;
    const arr = [...draggableItems];
    const [moved] = arr.splice(ds.from, 1);
    arr.splice(ds.to, 0, moved);
    return arr;
  })();

  return (
    <div className="h-full flex flex-col px-3 py-3">
      {/* Search */}
      <div className="relative flex-shrink-0 mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
        <input
          type="text"
          placeholder="Pretraži pesmu..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:border-white/30 outline-none"
          style={{ fontSize: '16px' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Search results or queue */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {query ? (
          isSearching ? (
            <div className="flex items-center justify-center gap-2 py-4 text-white/50 text-xs">
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              Pretraživanje...
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-white/40 text-xs py-4">Nema rezultata</p>
          ) : (
            results.map(track => (
              <div key={track.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <img src={track.album.cover_small} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                  <p className="text-[11px] text-white/50 truncate">{track.artist.name}</p>
                </div>
                <button
                  onClick={() => handleAddToQueue(track)}
                  title="Dodaj u red"
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={() => handlePlayNow(track)}
                  title="Pusti odmah"
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-infinity-green-500/80 hover:bg-infinity-green-500 text-white transition-colors"
                >
                  <Play size={11} fill="currentColor" />
                </button>
              </div>
            ))
          )
        ) : draggableItems.length === 0 && !currentSong ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Music className="text-white/20 mb-2" size={24} />
            <p className="text-white/40 text-xs">Pretraži i dodaj pesme</p>
          </div>
        ) : (
          <>
            {currentSong && (
              <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg bg-white/10 border border-white/10">
                <div className="w-5 flex-shrink-0" />
                <img src={currentSong.artwork} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{currentSong.title}</p>
                  <p className="text-[11px] text-white/50 truncate">{currentSong.artist}</p>
                </div>
                {songState === 'playing' && <span className="text-[9px] font-bold text-infinity-green-400 flex-shrink-0">SVIRA</span>}
              </div>
            )}

            {displayDraggable.map((song, i) => {
              const isBeingDragged = draggedSong !== null && song === draggedSong;
              const isDropTarget = ds !== null && i === ds.to && ds.from !== ds.to;
              return (
                <div
                  key={`${song.title}-${song.artist}-${i}`}
                  ref={el => { itemEls.current[i] = el; }}
                  className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg"
                  style={{
                    background: isBeingDragged ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: isBeingDragged ? '1px dashed rgba(255,255,255,0.3)' : isDropTarget ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                    opacity: isBeingDragged ? 0.55 : 1,
                    transition: ds ? 'none' : 'all 0.15s ease',
                  }}
                >
                  <div
                    onPointerDown={e => handleGripPointerDown(e, i)}
                    className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-white/30 hover:text-white/70"
                    style={{ cursor: 'grab', touchAction: 'none', transition: 'color 0.15s' }}
                  >
                    <GripVertical size={13} />
                  </div>
                  <img src={song.artwork} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{song.title}</p>
                    <p className="text-[11px] text-white/50 truncate">{song.artist}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
