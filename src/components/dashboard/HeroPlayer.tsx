import { useEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Volume2, VolumeX, SkipForward, Radio as RadioIcon, X } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer } from '../../contexts/SongPlayerContext';
import NowPlayingIndicator from '../player/NowPlayingIndicator';
import PlaylistPanel from './PlaylistPanel';

interface HeroPlayerProps {
  heroSlotRef: RefObject<HTMLDivElement | null>;
  getStationOriginEl: (id: string) => HTMLElement | null;
  getDjOriginEl: () => HTMLElement | null;
  onHiddenStationChange?: (id: string | null) => void;
}

type Phase = 'closed' | 'opening' | 'expanded' | 'closing';
type Displayed = { mode: 'radio'; id: string } | { mode: 'song' } | null;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAUSE_GRACE_MS = 10000;
const ANIM_MS = 600;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // smooth "expo-out" glide
const EXPANDED_HEIGHT = 'h-[280px] md:h-[360px]';
const EXPANDED_RADIUS = 24; // matches Tailwind's rounded-3xl, used for FLIP math
const FLY_SHADOW = '0 30px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)';
const SETTLED_SHADOW = '0 20px 40px -16px rgba(0,0,0,0.4)';

function heroHeight() {
  return window.innerWidth < 768 ? 280 : 360;
}

// Only exists in the DOM while something is playing (or was just paused, inside
// the grace window). Grows from the clicked card up into the hero slot via a
// FLIP-style rect animation (a `position: fixed` overlay, only during the
// opening/closing transitions), then settles into an ordinary in-flow static
// block so it scrolls with the page like everything else instead of tracking
// the viewport. On pause + 10s grace it reverses: swaps back to the fixed
// overlay, shrinks down to the origin card, and unmounts. Switching directly
// from one station to another (while already expanded) plays both halves in
// sequence — the old station flies back down, then the new one flies up.
export default function HeroPlayer({ heroSlotRef, getStationOriginEl, getDjOriginEl, onHiddenStationChange }: HeroPlayerProps) {
  const { currentStation, isPlaying, pause, playStation, volume, setVolume, nowPlayingTitle, nowPlayingCover } = useAudio();
  const { songState, currentSong, pauseSong, resumeSong, skipSong, stopSong, songQueue } = useSongPlayer();

  const isSongActiveNow = songState === 'playing' || songState === 'paused' || songState === 'loading';
  const mode: 'song' | 'radio' | 'none' = isSongActiveNow ? 'song' : currentStation ? 'radio' : 'none';
  const isPlayingNow = mode === 'song' ? songState === 'playing' : mode === 'radio' ? isPlaying : false;

  const [phase, setPhase] = useState<Phase>('closed');
  const [rect, setRect] = useState<Rect | null>(null);
  const [radius, setRadius] = useState(16);
  const [flying, setFlying] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [forceClosed, setForceClosed] = useState(false);
  const [hiddenStationId, setHiddenStationId] = useState<string | null>(null);
  const [draftVolume, setDraftVolume] = useState<number | null>(null);

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const staticBoxRef = useRef<HTMLDivElement>(null);
  const displayedRef = useRef<Displayed>(null);

  const active = mode !== 'none' && !forceClosed;

  useEffect(() => {
    onHiddenStationChange?.(hiddenStationId);
  }, [hiddenStationId, onHiddenStationChange]);

  // Resuming/starting playback always cancels any pending revert-to-idle.
  useEffect(() => {
    if (isPlayingNow) setForceClosed(false);
  }, [isPlayingNow]);

  // 10s pause grace — after this, the hero shrinks back into the grid.
  useEffect(() => {
    if (mode !== 'none' && !isPlayingNow && !(mode === 'song' && songState === 'loading')) {
      pauseTimerRef.current = setTimeout(() => setForceClosed(true), PAUSE_GRACE_MS);
      return () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); };
    }
  }, [mode, isPlayingNow, songState]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timeoutsRef.current.push(setTimeout(fn, ms));
  };

  const targetRect = (): Rect => {
    const slot = heroSlotRef.current;
    const r = slot?.getBoundingClientRect();
    const scrollY = window.scrollY;
    return {
      top: r ? r.top + scrollY : 96,
      left: r ? r.left : 16,
      width: r ? r.width : window.innerWidth - 32,
      height: heroHeight(),
    };
  };

  const openFromOrigin = (fromEl: HTMLElement | null) => {
    clearTimeouts();
    const from = fromEl?.getBoundingClientRect();
    const target = targetRect();

    if (from) {
      setRect({ top: from.top, left: from.left, width: from.width, height: from.height });
      setRadius(20);
    } else {
      // No known origin — fade/scale in from roughly the target position.
      setRect({ top: target.top + 24, left: target.left, width: target.width, height: target.height * 0.6 });
      setRadius(24);
    }
    setFlying(false);
    setContentReady(false);
    setPhase('opening');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    after(20, () => {
      setRect(target);
      setRadius(28);
      setFlying(true);
    });
    after(ANIM_MS, () => { setPhase('expanded'); setFlying(false); });
    after(ANIM_MS - 200, () => setContentReady(true));
  };

  const closeToOrigin = (toEl: HTMLElement | null, onDone: () => void) => {
    clearTimeouts();
    // The hero has been an ordinary in-flow block while expanded, so it may
    // have scrolled anywhere — read its real on-screen position rather than
    // recomputing the slot's original (pre-scroll) target rect.
    const liveRect = staticBoxRef.current?.getBoundingClientRect();
    const from: Rect = liveRect
      ? { top: liveRect.top, left: liveRect.left, width: liveRect.width, height: liveRect.height }
      : targetRect();
    setRect(from);
    setRadius(EXPANDED_RADIUS);
    setFlying(false);
    setContentReady(false);
    setPhase('closing');

    if (toEl) {
      const current = toEl.getBoundingClientRect();
      // scrollIntoView({block:'center'}) will settle so the element's vertical
      // center matches the viewport's vertical center — compute that final
      // position analytically instead of re-measuring mid-scroll (which would
      // race the smooth-scroll animation and read a stale rect).
      const finalTop = window.innerHeight / 2 - current.height / 2;
      toEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      after(20, () => {
        setRect({ top: finalTop, left: current.left, width: current.width, height: current.height });
        setRadius(20);
        setFlying(true);
      });
    } else {
      after(20, () => {
        setRect({ top: from.top + 24, left: from.left, width: from.width, height: from.height * 0.6 });
        setFlying(true);
      });
    }
    after(ANIM_MS, () => { setPhase('closed'); setRect(null); setFlying(false); onDone(); });
  };

  // Open (grow) / close (shrink) transitions
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      if (mode === 'radio' && currentStation) {
        displayedRef.current = { mode: 'radio', id: currentStation.id };
        setHiddenStationId(currentStation.id);
        openFromOrigin(getStationOriginEl(currentStation.id));
      } else {
        displayedRef.current = { mode: 'song' };
        openFromOrigin(getDjOriginEl());
      }
    } else if (!active && prevActiveRef.current) {
      const d = displayedRef.current;
      const toEl = d?.mode === 'radio' ? getStationOriginEl(d.id) : d?.mode === 'song' ? getDjOriginEl() : null;
      closeToOrigin(toEl, () => {
        displayedRef.current = null;
        setHiddenStationId(null);
      });
    }
    prevActiveRef.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Switching directly from one station to another while already expanded —
  // play the old one flying back down, then the new one flying up, instead
  // of just silently swapping the content in place.
  useEffect(() => {
    const d = displayedRef.current;
    if (
      mode === 'radio' && phase === 'expanded' &&
      d?.mode === 'radio' && currentStation && d.id !== currentStation.id
    ) {
      const oldId = d.id;
      const newId = currentStation.id;
      closeToOrigin(getStationOriginEl(oldId), () => {
        displayedRef.current = { mode: 'radio', id: newId };
        setHiddenStationId(newId);
        openFromOrigin(getStationOriginEl(newId));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStation?.id]);

  useEffect(() => () => clearTimeouts(), []);

  const cover = mode === 'song' ? currentSong?.artwork ?? null : nowPlayingCover;
  const title = mode === 'song' ? (currentSong?.title ?? '') : (nowPlayingTitle || currentStation?.genre || '');
  const subtitle = mode === 'song' ? (currentSong?.artist ?? '') : (currentStation?.name ?? '');
  const showSkip = mode === 'song' && songQueue.length > 0;
  const isLoadingSong = mode === 'song' && songState === 'loading';

  const handleTogglePlay = () => {
    if (mode === 'song') {
      songState === 'playing' ? pauseSong() : resumeSong();
    } else if (mode === 'radio' && currentStation) {
      isPlaying ? pause() : playStation(currentStation);
    }
  };

  const isPlaylistMode = mode === 'song';

  const nowPlayingSection = (
    <div className="relative h-full flex-1 min-w-0 min-h-0 overflow-hidden">
      {cover && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${cover})`,
            filter: 'blur(40px) brightness(0.55)',
            animation: 'hero-bg-in 1.2s ease-out forwards',
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />

      <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 text-center">
        <div
          className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0"
          style={{ animation: 'hero-cover-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <RadioIcon className="text-white" size={48} />
          )}
          {isPlayingNow && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
              <NowPlayingIndicator />
            </div>
          )}
          {isLoadingSong && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <h2
          className="text-white font-serif font-bold text-lg md:text-xl truncate w-full mb-1"
          style={{ animation: 'hero-text-in 0.5s ease-out 0.16s both' }}
        >
          {title || 'Nema podataka'}
        </h2>
        <p
          className={`text-sm md:text-base truncate w-full mb-5 ${isLoadingSong ? 'text-infinity-green-400 animate-pulse' : 'text-white/70'}`}
          style={{ animation: 'hero-text-in 0.5s ease-out 0.24s both' }}
        >
          {isLoadingSong ? 'Učitava se...' : subtitle}
        </p>

        <div
          className="flex items-center gap-4 md:gap-6"
          style={{ animation: 'hero-text-in 0.5s ease-out 0.32s both' }}
        >
          <button
            onClick={() => (volume > 0 ? setVolume(0) : setVolume(0.7))}
            className="text-white/70 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={draftVolume ?? volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (mode === 'song') {
                // Only move the slider visually while dragging — committing
                // setVolume() on every tick sends a YouTube setVolume()
                // postMessage on nearly every pixel of movement, which is
                // what was breaking playback. Commit once, on release.
                setDraftVolume(v);
              } else {
                setVolume(v);
              }
            }}
            onMouseUp={(e) => { if (mode === 'song') { setVolume(parseFloat((e.target as HTMLInputElement).value)); setDraftVolume(null); } }}
            onTouchEnd={(e) => { if (mode === 'song') { setVolume(parseFloat((e.target as HTMLInputElement).value)); setDraftVolume(null); } }}
            onKeyUp={(e) => { if (mode === 'song') { setVolume(parseFloat((e.target as HTMLInputElement).value)); setDraftVolume(null); } }}
            className="w-20 md:w-28 h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-infinity-green-500"
          />

          <button
            onClick={handleTogglePlay}
            disabled={isLoadingSong}
            className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg disabled:opacity-70 disabled:hover:scale-100"
          >
            {isLoadingSong ? (
              <div className="w-6 h-6 border-2 border-gray-900/70 border-t-transparent rounded-full animate-spin" />
            ) : isPlayingNow ? (
              <Pause className="text-gray-900" size={26} />
            ) : (
              <Play className="text-gray-900 ml-1" size={26} fill="currentColor" />
            )}
          </button>

          {showSkip ? (
            <button onClick={skipSong} className="text-white/70 hover:text-white transition-colors" title="Preskoči pesmu">
              <SkipForward size={22} />
            </button>
          ) : (
            <div className="w-[22px]" />
          )}
        </div>
      </div>
    </div>
  );

  const isGeometryAnimating = phase === 'opening' || phase === 'closing';

  return (
    <>
      <div ref={heroSlotRef}>
        {phase === 'expanded' && (
          <div
            ref={staticBoxRef}
            className={`relative w-full rounded-3xl overflow-hidden bg-gray-900 mb-6 md:mb-8 transition-[height] duration-300 ease-out ${
              isPlaylistMode ? 'h-[560px] md:h-[420px]' : EXPANDED_HEIGHT
            }`}
            style={{ boxShadow: SETTLED_SHADOW }}
          >
            {contentReady && (
              <div className="absolute inset-0 flex flex-col md:flex-row">
                {nowPlayingSection}
                {isPlaylistMode && (
                  <div className="relative w-full md:w-72 h-56 md:h-full flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 bg-black/25">
                    <PlaylistPanel />
                  </div>
                )}
              </div>
            )}
            {isPlaylistMode && (
              <button
                onClick={stopSong}
                title="Isključi plejlistu"
                className="absolute top-3 left-3 z-10 flex items-center gap-1.5 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <X size={14} />
                Isključi plejlistu
              </button>
            )}
          </div>
        )}
      </div>

      {isGeometryAnimating && createPortal(
        <div
          className="fixed z-40 overflow-hidden bg-gray-900"
          style={{
            top: rect?.top ?? 0,
            left: rect?.left ?? 0,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            borderRadius: radius,
            boxShadow: flying ? FLY_SHADOW : SETTLED_SHADOW,
            transition: `top ${ANIM_MS}ms ${EASE}, left ${ANIM_MS}ms ${EASE}, width ${ANIM_MS}ms ${EASE}, height ${ANIM_MS}ms ${EASE}, border-radius ${ANIM_MS}ms ${EASE}, box-shadow ${ANIM_MS}ms ${EASE}`,
          }}
        >
          {/* Small preview shown only while flying between the card and the slot */}
          <div className="absolute inset-0 flex items-center gap-3 px-4">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-infinity flex items-center justify-center"
              style={{ animation: 'hero-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <RadioIcon className="text-white" size={22} />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
