import { useState, useEffect, useRef, RefObject } from 'react';
import { X, Music, Headphones, Play, Clock, Monitor, Smartphone, Tablet, ListMusic, GripVertical, MapPin, ChevronDown, Check } from 'lucide-react';
import { useSongPlayer, SongInfo } from '../../contexts/SongPlayerContext';
import { useAudio } from '../../contexts/AudioContext';
import { RemoteDevice } from '../../hooks/useRemoteSession';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  artist: { name: string };
  album: { cover_small: string; cover_medium: string; cover_big: string };
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
      if (item.id && !seen.has(item.id)) { seen.add(item.id); merged.push(item); }
    }
  }
  return merged;
}

function DeviceIcon({ type, size = 15 }: { type: string; size?: number }) {
  if (type === 'desktop') return <Monitor size={size} />;
  if (type === 'tablet') return <Tablet size={size} />;
  return <Smartphone size={size} />;
}

// ─── Multi-step play modal (where + when) ────────────────────────────────────

interface PlayDestinationModalProps {
  track: DeezerTrack;
  remoteSessions: RemoteDevice[];
  canQueue: boolean;
  onPlayLocal: (immediate: boolean) => void;
  onPlayRemote: (deviceIds: string[], immediate: boolean) => void;
  onClose: () => void;
}

function PlayDestinationModal({ track, remoteSessions, canQueue, onPlayLocal, onPlayRemote, onClose }: PlayDestinationModalProps) {
  const [step, setStep] = useState<'where' | 'when'>('where');
  const [destination, setDestination] = useState<'local' | 'remote'>('local');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const toggleDevice = (id: string) =>
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const handleContinue = () => {
    if (destination === 'remote' && selectedDevices.length === 0) return;
    // For remote: always ask when (the remote device may already be playing something)
    // For local: only ask when if something is currently playing
    if (destination === 'remote' || canQueue) { setStep('when'); return; }
    onPlayLocal(true);
  };

  const handleWhen = (immediate: boolean) => {
    if (destination === 'local') onPlayLocal(immediate);
    else onPlayRemote(selectedDevices, immediate);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-infinity-dark-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-3 mb-5">
          <img
            src={track.album.cover_big || track.album.cover_medium}
            alt={track.title}
            className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{track.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{track.artist.name}</p>
          </div>
        </div>

        {step === 'where' ? (
          <>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Gde pustiti?</p>

            <button
              onClick={() => setDestination('local')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all mb-2 ${
                destination === 'local'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Smartphone size={18} className={destination === 'local' ? 'text-violet-600' : 'text-gray-400'} />
              <span className={`font-semibold text-sm flex-1 text-left ${destination === 'local' ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                Na ovom uređaju
              </span>
            </button>

            {remoteSessions.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setDestination('remote');
                    if (selectedDevices.length === 0) setSelectedDevices([remoteSessions[0].device_id]);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all mb-2 ${
                    destination === 'remote'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Monitor size={18} className={destination === 'remote' ? 'text-violet-600' : 'text-gray-400'} />
                  <span className={`font-semibold text-sm flex-1 text-left ${destination === 'remote' ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    U lokalu
                  </span>
                  <span className="text-xs text-gray-400">{remoteSessions.length} uređaj{remoteSessions.length > 1 ? 'a' : ''}</span>
                </button>

                {destination === 'remote' && (
                  <div className="ml-3 space-y-1.5 mb-3">
                    {remoteSessions.map(device => (
                      <button
                        key={device.device_id}
                        onClick={() => toggleDevice(device.device_id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                          selectedDevices.includes(device.device_id)
                            ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-infinity-dark-700'
                        }`}
                      >
                        <DeviceIcon type={device.device_type} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left truncate">
                          {device.device_name}
                        </span>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedDevices.includes(device.device_id)
                            ? 'border-violet-500 bg-violet-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedDevices.includes(device.device_id) && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleContinue}
              disabled={destination === 'remote' && selectedDevices.length === 0}
              className="w-full py-3.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors mt-1"
            >
              Dalje →
            </button>
            <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              Otkaži
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Kada pustiti?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleWhen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Play size={18} fill="currentColor" />
                Pusti odmah
              </button>
              <button
                onClick={() => handleWhen(false)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-colors"
              >
                <Clock size={18} />
                Posle ove pesme
              </button>
              <button
                onClick={() => setStep('where')}
                className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                ← Nazad
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Simple play modal (no remote sessions) ───────────────────────────────────

interface SimplePlayModalProps {
  track: DeezerTrack;
  canQueue: boolean;
  onPlayNow: () => void;
  onPlayAfter: () => void;
  onClose: () => void;
}

function SimplePlayModal({ track, canQueue, onPlayNow, onPlayAfter, onClose }: SimplePlayModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4 bg-black/70 backdrop-blur-sm"
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
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold transition-colors"
          >
            <Play size={18} fill="currentColor" />
            Pusti odmah
          </button>
          {canQueue && (
            <button
              onClick={onPlayAfter}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 dark:bg-infinity-dark-700 hover:bg-gray-200 dark:hover:bg-infinity-dark-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-colors"
            >
              <Clock size={18} />
              Posle ove pesme
            </button>
          )}
          <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            Otkaži
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export interface DJManagerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  remoteSessions: RemoteDevice[];
  sendRemoteCommand: (deviceId: string, command: string) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}

const EQ_TIMINGS = [0.55, 0.7, 0.5, 0.65, 0.6, 0.75, 0.5, 0.6, 0.55, 0.7, 0.5, 0.65];

export default function DJManagerOverlay({ isOpen, onClose, remoteSessions, sendRemoteCommand, buttonRef }: DJManagerOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [buttonRect, setButtonRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<DeezerTrack | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state (ref-based to avoid re-render churn during drag)
  const dragStateRef = useRef<{ from: number; to: number } | null>(null);
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const draggableItemsRef = useRef<SongInfo[]>([]);
  const reorderQueueRef = useRef<(newFlatOrder: SongInfo[]) => void>(() => {});
  const [, forceUpdate] = useState(0);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const { playSong, queueSong, songState, currentSong, songQueue, postRadioQueue, reorderQueue } = useSongPlayer();
  const { isPlaying, currentStation } = useAudio();
  const canQueue = (isPlaying && !!currentStation) || songState === 'playing' || songState === 'paused';

  // PlayDestinationModal (gde pustiti) se prikazuje SAMO na mobilnom/tabletu
  const isDesktop = typeof window !== 'undefined' &&
    (!('ontouchstart' in window) && navigator.maxTouchPoints === 0 || window.innerWidth >= 1024);

  const allSongs: SongInfo[] = currentSong
    ? [currentSong, ...songQueue, ...postRadioQueue]
    : [...songQueue, ...postRadioQueue];

  const draggableItems = [...songQueue, ...postRadioQueue];
  draggableItemsRef.current = draggableItems;
  reorderQueueRef.current = reorderQueue;

  // Open/close animation
  useEffect(() => {
    if (isOpen) {
      const rect = buttonRef.current?.getBoundingClientRect();
      setButtonRect(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null);
      setVisible(true);
      setExpanded(false);
      setContentVisible(false);
      const t1 = setTimeout(() => setExpanded(true), 30);
      const t2 = setTimeout(() => setContentVisible(true), 280);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setContentVisible(false);
      const t1 = setTimeout(() => setExpanded(false), 150);
      const t2 = setTimeout(() => { setVisible(false); setButtonRect(null); }, 550);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen, buttonRef]);

  // Focus search input when overlay opens
  useEffect(() => {
    if (contentVisible) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [contentVisible]);

  // Close location picker when overlay hides
  useEffect(() => {
    if (!isOpen) setShowLocationPicker(false);
  }, [isOpen]);

  // Reset selected location if that device disconnects
  useEffect(() => {
    if (selectedLocationId && !remoteSessions.find(s => s.device_id === selectedLocationId)) {
      setSelectedLocationId(null);
    }
  }, [remoteSessions, selectedLocationId]);

  // Search debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setResults([]); setShowResults(false); setIsSearching(false); return; }
    setIsSearching(true);
    setShowResults(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchDeezer(query);
        setResults(data);
      } catch { setResults([]); } finally { setIsSearching(false); }
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  const buildSongInfo = (track: DeezerTrack): SongInfo => ({
    title: track.title,
    artist: track.artist.name,
    artwork: track.album.cover_big || track.album.cover_medium,
    youtubeQuery: `${track.title} ${track.artist.name}`,
    durationSeconds: track.duration,
  });

  const handlePlayLocal = (immediate: boolean) => {
    if (!selected) return;
    const song = buildSongInfo(selected);
    if (immediate) playSong(song); else queueSong(song);
    setSelected(null); setQuery(''); setResults([]);
  };

  const handlePlayRemote = (deviceIds: string[], immediate: boolean) => {
    if (!selected) return;
    const song = buildSongInfo(selected);
    const payload = encodeURIComponent(JSON.stringify({ ...song, immediate }));
    deviceIds.forEach(id => sendRemoteCommand(id, `song_play:${payload}`));
    setSelected(null); setQuery(''); setResults([]);
  };

  const selectedDevice = selectedLocationId
    ? remoteSessions.find(s => s.device_id === selectedLocationId) ?? null
    : null;
  const remoteDisplayQueue: SongInfo[] = selectedDevice?.song_queue ?? [];
  const hasRemoteCurrentSong = !!(selectedDevice && selectedDevice.song_state !== 'idle' && selectedDevice.song_title);

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

  const handleClose = () => {
    setSelected(null); setQuery(''); setResults([]); setShowResults(false);
    onClose();
  };

  if (!visible) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const r = buttonRect;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: expanded ? 0 : (r?.top ?? vh * 0.75),
    left: expanded ? 0 : (r?.left ?? vw * 0.05),
    width: expanded ? vw : (r?.width ?? vw * 0.5),
    height: expanded ? vh : (r?.height ?? 44),
    borderRadius: expanded ? 0 : 14,
    zIndex: 65,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0f0a1e 0%, #1e0a3c 40%, #0f172a 100%)',
    transition: [
      'top 0.42s cubic-bezier(0.4,0,0.2,1)',
      'left 0.42s cubic-bezier(0.4,0,0.2,1)',
      'width 0.42s cubic-bezier(0.4,0,0.2,1)',
      'height 0.42s cubic-bezier(0.4,0,0.2,1)',
      'border-radius 0.42s cubic-bezier(0.4,0,0.2,1)',
    ].join(', '),
  };

  return (
    <>
      <div style={overlayStyle}>
        {/* Ambient background blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-20%', right: '-10%', width: 384, height: 384,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-15%', left: '-5%', width: 288, height: 288,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Content — fades in after overlay expands */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-5 pb-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 22px)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(167,139,250,0.35)' }}>
                    <Headphones size={18} className="text-violet-200" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">DJ Manager</h1>
                    <p className="hidden sm:block text-xs mt-0.5 leading-snug" style={{ color: 'rgba(196,181,253,0.7)' }}>
                      Pustaj pesme po želji u svom lokalu
                    </p>
                  </div>
                </div>
                {/* EQ bars */}
                <div className="flex items-end gap-[2px] mt-2" style={{ height: 14 }}>
                  {EQ_TIMINGS.map((dur, i) => (
                    <div
                      key={i}
                      style={{
                        width: 2, height: '100%', borderRadius: 2, flexShrink: 0,
                        background: 'linear-gradient(to top, rgba(124,58,237,0.7), rgba(232,121,249,0.5))',
                        animation: `eq-bar ${dur}s ease-in-out infinite`,
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Close hint + X */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {/* Hint tekst i strelica — vidljivi samo na sm+ (tablet/desktop) */}
                <p
                  className="hidden sm:block whitespace-nowrap"
                  style={{ fontSize: 13, color: 'rgba(196,181,253,0.75)' }}
                >
                  Slobodno zatvorite DJ Manager nakon odabira pesama
                </p>
                <svg className="hidden sm:block" width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ color: 'rgba(196,181,253,0.6)', flexShrink: 0 }}>
                  <path d="M1 5 H11 M8 2 L12 5 L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 mx-5 mt-4" style={{ height: 1, background: 'rgba(167,139,250,0.15)' }} />

          {/* Location picker — shown when remote sessions exist */}
          {remoteSessions.length > 0 && (
            <div className="flex-shrink-0 px-5 pt-3">
              <button
                onClick={() => setShowLocationPicker(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(167,139,250,0.2)', color: 'rgba(196,181,253,0.85)' }}
              >
                <MapPin size={12} style={{ color: 'rgba(167,139,250,0.65)', flexShrink: 0 }} />
                <span className="font-medium truncate" style={{ maxWidth: 200 }}>
                  {selectedDevice ? selectedDevice.device_name : 'Ovaj uređaj'}
                </span>
                <ChevronDown
                  size={12}
                  style={{ flexShrink: 0, opacity: 0.55, transform: showLocationPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </button>

              {showLocationPicker && (
                <div
                  className="mt-2 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(10,5,25,0.97)', border: '1px solid rgba(167,139,250,0.22)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 240, overflowY: 'auto' }}
                >
                  <button
                    onClick={() => { setSelectedLocationId(null); setShowLocationPicker(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
                    style={{ borderBottom: '1px solid rgba(167,139,250,0.08)', background: selectedLocationId === null ? 'rgba(124,58,237,0.18)' : 'transparent' }}
                  >
                    <Smartphone size={14} style={{ color: 'rgba(167,139,250,0.6)', flexShrink: 0 }} />
                    <span className="flex-1 text-sm font-medium" style={{ color: 'rgba(196,181,253,0.9)' }}>Ovaj uređaj</span>
                    {selectedLocationId === null && <Check size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />}
                  </button>
                  {remoteSessions.map((dev, idx) => (
                    <button
                      key={dev.device_id}
                      onClick={() => { setSelectedLocationId(dev.device_id); setShowLocationPicker(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
                      style={{
                        borderBottom: idx < remoteSessions.length - 1 ? '1px solid rgba(167,139,250,0.08)' : 'none',
                        background: selectedLocationId === dev.device_id ? 'rgba(124,58,237,0.18)' : 'transparent',
                      }}
                    >
                      <DeviceIcon type={dev.device_type} size={14} />
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'rgba(196,181,253,0.9)' }}>{dev.device_name}</span>
                      {selectedLocationId === dev.device_id && <Check size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search + results */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
            <div className="relative mb-3">
              <Music
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                size={18}
                style={{ left: 12, color: 'rgba(167,139,250,0.7)' }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Pretraži pesmu po imenu ili izvođaču..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                className="w-full rounded-xl text-white focus:outline-none"
                style={{
                  paddingLeft: 38, paddingRight: 36, paddingTop: 12, paddingBottom: 12,
                  fontSize: 16,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  caretColor: '#a78bfa',
                }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)')}
              />
              {/* placeholder color hack */}
              <style>{`input::placeholder { color: rgba(196,181,253,0.4); }`}</style>
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
                  className="absolute top-1/2 -translate-y-1/2 transition-colors"
                  style={{ right: 12, color: 'rgba(196,181,253,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.5)')}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showResults && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.15)', background: 'rgba(255,255,255,0.04)' }}>
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 p-6">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(167,139,250,0.8)', borderTopColor: 'transparent' }} />
                    <span className="text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>Pretraživanje...</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
                    Nije pronađena nijedna pesma
                  </div>
                ) : (
                  <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
                    {results.map((track, idx) => (
                      <button
                        key={track.id}
                        onClick={() => { setSelected(track); setShowResults(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                        style={{
                          borderTop: idx > 0 ? '1px solid rgba(167,139,250,0.08)' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <img
                          src={track.album.cover_small || track.album.cover_medium}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{track.artist.name}</p>
                        </div>
                        <Play size={14} style={{ color: 'rgba(167,139,250,0.4)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Remote playlist — when a remote location is selected */}
            {selectedDevice && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <ListMusic size={13} style={{ color: 'rgba(196,181,253,0.55)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(196,181,253,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Playlist — {selectedDevice.device_name}
                  </span>
                </div>

                {!hasRemoteCurrentSong && remoteDisplayQueue.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p style={{ fontSize: 13, color: 'rgba(196,181,253,0.35)' }}>Nema pesama u playlisti</p>
                  </div>
                ) : (
                  <div className="space-y-1.5" style={{ userSelect: 'none' }}>
                    {hasRemoteCurrentSong && (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(167,139,250,0.25)' }}>
                        <div className="w-5 flex-shrink-0" />
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.25)' }}>
                          <Music size={16} style={{ color: 'rgba(167,139,250,0.7)' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{selectedDevice.song_title}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{selectedDevice.song_artist ?? ''}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {selectedDevice.song_state === 'playing' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(124,58,237,0.4)', color: '#c4b5fd' }}>▶</span>
                          )}
                          {selectedDevice.song_state === 'paused' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(196,181,253,0.6)' }}>⏸</span>
                          )}
                          {selectedDevice.song_state === 'loading' && (
                            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(167,139,250,0.7)', borderTopColor: 'transparent' }} />
                          )}
                        </div>
                      </div>
                    )}
                    {remoteDisplayQueue.map((song, i) => (
                      <div
                        key={`remote-${song.title}-${song.artist}-${i}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid transparent' }}
                      >
                        <div className="w-5 flex-shrink-0" />
                        <img src={song.artwork} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{song.artist}</p>
                        </div>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: 'rgba(196,181,253,0.35)' }}>
                          #{(hasRemoteCurrentSong ? 1 : 0) + i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local playlist — uvek prikazana ispod rezultata pretrage */}
            {!selectedDevice && allSongs.length > 0 && (() => {
              const ds = dragStateRef.current;
              const draggedSong = ds !== null ? draggableItems[ds.from] : null;

              // Compute display order with drag preview
              const displayDraggable = (() => {
                if (!ds || ds.from === ds.to) return draggableItems;
                const arr = [...draggableItems];
                const [moved] = arr.splice(ds.from, 1);
                arr.splice(ds.to, 0, moved);
                return arr;
              })();

              return (
                <div className="mt-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <ListMusic size={13} style={{ color: 'rgba(196,181,253,0.55)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(196,181,253,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Playlist — {allSongs.length} {allSongs.length === 1 ? 'pesma' : allSongs.length < 5 ? 'pesme' : 'pesama'}
                    </span>
                  </div>

                  {/* Hint za jednu pesmu */}
                  {allSongs.length === 1 && (
                    <div
                      className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl mb-3"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.2)' }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
                      <p style={{ fontSize: 12, color: 'rgba(196,181,253,0.75)', lineHeight: 1.4 }}>
                        Dodaj još pesama kako bi napravio playlist-u
                      </p>
                    </div>
                  )}

                  {/* Drag hint — visible when 2+ queue items and not mid-drag */}
                  {draggableItems.length >= 2 && !ds && (
                    <div className="flex items-center gap-1.5 mb-2 select-none" style={{ color: 'rgba(196,181,253,0.38)', fontSize: 11 }}>
                      <GripVertical size={11} style={{ flexShrink: 0 }} />
                      <span>Drži i prevuci da promeniš redosled</span>
                    </div>
                  )}

                  <div className="space-y-1.5" style={{ userSelect: 'none' }}>
                    {/* Currently playing song — not draggable */}
                    {currentSong && (() => {
                      const isPlaying_ = songState === 'playing';
                      const isLoading_ = songState === 'loading';
                      const isPaused_ = songState === 'paused';
                      return (
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(167,139,250,0.25)' }}
                        >
                          <div className="w-5 flex-shrink-0" /> {/* spacer aligns with grip */}
                          <div className="relative flex-shrink-0">
                            <img src={currentSong.artwork} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                            {isPlaying_ && (
                              <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-1 gap-[2px]" style={{ background: 'rgba(0,0,0,0.45)' }}>
                                {[0.55, 0.7, 0.5].map((dur, i) => (
                                  <div key={i} style={{ width: 2, height: '55%', borderRadius: 2, background: '#a78bfa', animation: `eq-bar ${dur}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                            <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{currentSong.artist}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {isLoading_ && <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(167,139,250,0.7)', borderTopColor: 'transparent' }} />}
                            {isPlaying_ && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(124,58,237,0.4)', color: '#c4b5fd' }}>▶</span>}
                            {isPaused_ && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(196,181,253,0.6)' }}>⏸</span>}
                            {songState === 'queued' && <span className="text-[10px]" style={{ color: 'rgba(196,181,253,0.5)' }}>⏳</span>}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Queue items — draggable */}
                    {displayDraggable.map((song, i) => {
                      const isBeingDragged = draggedSong !== null && song === draggedSong;
                      const isDropTarget = ds !== null && i === ds.to && ds.from !== ds.to;
                      return (
                        <div
                          key={`${song.title}-${song.artist}`}
                          ref={el => { itemEls.current[i] = el; }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{
                            background: isBeingDragged ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.05)',
                            border: isBeingDragged ? '1px dashed rgba(167,139,250,0.4)' : isDropTarget ? '1px solid rgba(167,139,250,0.35)' : '1px solid transparent',
                            opacity: isBeingDragged ? 0.55 : 1,
                            transition: ds ? 'none' : 'all 0.15s ease',
                          }}
                        >
                          {/* Drag handle */}
                          <div
                            onPointerDown={e => handleGripPointerDown(e, i)}
                            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded"
                            style={{
                              color: 'rgba(196,181,253,0.3)',
                              cursor: 'grab',
                              touchAction: 'none',
                              transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.7)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.3)')}
                          >
                            <GripVertical size={14} />
                          </div>

                          <div className="relative flex-shrink-0">
                            <img src={song.artwork} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                            <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{song.artist}</p>
                          </div>
                          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: 'rgba(196,181,253,0.35)' }}>#{(currentSong ? 1 : 0) + i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Empty state — samo kada nema ni pesama ni upita, i gledamo lokalni uredjaj */}
            {!selectedDevice && !showResults && !query && allSongs.length === 0 && (
              <div className="text-center py-14">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.2)' }}
                >
                  <Music size={26} style={{ color: 'rgba(167,139,250,0.5)' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(196,181,253,0.4)' }}>
                  Ukucaj ime pesme ili izvođača
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lokacija je unapred izabrana — pošalji na taj remote uređaj */}
      {selected && selectedLocationId && (
        <SimplePlayModal
          track={selected}
          canQueue={true}
          onPlayNow={() => {
            if (!selected) return;
            const song = buildSongInfo(selected);
            const payload = encodeURIComponent(JSON.stringify({ ...song, immediate: true }));
            sendRemoteCommand(selectedLocationId, `song_play:${payload}`);
            setSelected(null); setQuery(''); setResults([]);
          }}
          onPlayAfter={() => {
            if (!selected) return;
            const song = buildSongInfo(selected);
            const payload = encodeURIComponent(JSON.stringify({ ...song, immediate: false }));
            sendRemoteCommand(selectedLocationId, `song_play:${payload}`);
            setSelected(null); setQuery(''); setResults([]);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Na mobilnom/tabletu sa remote uređajima — pitaj gde i kada */}
      {selected && !selectedLocationId && remoteSessions.length > 0 && !isDesktop && (
        <PlayDestinationModal
          track={selected}
          remoteSessions={remoteSessions}
          canQueue={canQueue}
          onPlayLocal={handlePlayLocal}
          onPlayRemote={handlePlayRemote}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Na desktopu ili bez remote uređaja — direktno pusti lokalno */}
      {selected && !selectedLocationId && (remoteSessions.length === 0 || isDesktop) && (
        <SimplePlayModal
          track={selected}
          canQueue={canQueue}
          onPlayNow={() => handlePlayLocal(true)}
          onPlayAfter={() => handlePlayLocal(false)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
