import { useEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Volume2, VolumeX, SkipForward, Radio as RadioIcon } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer } from '../../contexts/SongPlayerContext';
import NowPlayingIndicator from '../player/NowPlayingIndicator';

interface HeroPlayerProps {
  heroSlotRef: RefObject<HTMLDivElement | null>;
  getStationOriginEl: () => HTMLElement | null;
  getDjOriginEl: () => HTMLElement | null;
}

type Phase = 'closed' | 'opening' | 'expanded' | 'closing';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAUSE_GRACE_MS = 10000;
const ANIM_MS = 480;
const EXPANDED_HEIGHT = 'h-[280px] md:h-[360px]';
const EXPANDED_RADIUS = 24; // matches Tailwind's rounded-3xl, used for FLIP math

function heroHeight() {
  return window.innerWidth < 768 ? 280 : 360;
}

// Only exists in the DOM while something is playing (or was just paused, inside
// the grace window). Grows from the clicked card up into the hero slot via a
// FLIP-style rect animation (a `position: fixed` overlay, only during the
// opening/closing transitions), then settles into an ordinary in-flow static
// block so it scrolls with the page like everything else instead of tracking
// the viewport. On pause + 10s grace it reverses: swaps back to the fixed
// overlay, shrinks down to the origin card, and unmounts.
export default function HeroPlayer({ heroSlotRef, getStationOriginEl, getDjOriginEl }: HeroPlayerProps) {
  const { currentStation, isPlaying, pause, playStation, volume, setVolume, nowPlayingTitle, nowPlayingCover } = useAudio();
  const { songState, currentSong, pauseSong, resumeSong, skipSong, songQueue } = useSongPlayer();

  const isSongActiveNow = songState === 'playing' || songState === 'paused' || songState === 'loading';
  const mode: 'song' | 'radio' | 'none' = isSongActiveNow ? 'song' : currentStation ? 'radio' : 'none';
  const isPlayingNow = mode === 'song' ? songState === 'playing' : mode === 'radio' ? isPlaying : false;

  const [phase, setPhase] = useState<Phase>('closed');
  const [rect, setRect] = useState<Rect | null>(null);
  const [radius, setRadius] = useState(16);
  const [contentReady, setContentReady] = useState(false);
  const [forceClosed, setForceClosed] = useState(false);

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const staticBoxRef = useRef<HTMLDivElement>(null);

  const active = mode !== 'none' && !forceClosed;

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

  const originEl = (): HTMLElement | null => {
    return mode === 'song' ? getDjOriginEl() : getStationOriginEl();
  };

  // Open (grow) / close (shrink) transitions
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      clearTimeouts();
      const fromEl = originEl();
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
      setContentReady(false);
      setPhase('opening');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      after(20, () => {
        setRect(target);
        setRadius(28);
      });
      after(ANIM_MS, () => setPhase('expanded'));
      after(ANIM_MS - 160, () => setContentReady(true));
    } else if (!active && prevActiveRef.current) {
      clearTimeouts();
      const toEl = originEl();
      // The hero has been an ordinary in-flow block while expanded, so it may
      // have scrolled anywhere — read its real on-screen position rather than
      // recomputing the slot's original (pre-scroll) target rect.
      const liveRect = staticBoxRef.current?.getBoundingClientRect();
      const from: Rect = liveRect
        ? { top: liveRect.top, left: liveRect.left, width: liveRect.width, height: liveRect.height }
        : targetRect();
      setRect(from);
      setRadius(EXPANDED_RADIUS);
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
        });
      } else {
        after(20, () => {
          setRect({ top: from.top + 24, left: from.left, width: from.width, height: from.height * 0.6 });
        });
      }
      after(ANIM_MS, () => { setPhase('closed'); setRect(null); });
    }
    prevActiveRef.current = active;
  }, [active]);

  useEffect(() => () => clearTimeouts(), []);

  const cover = mode === 'song' ? currentSong?.artwork ?? null : nowPlayingCover;
  const title = mode === 'song' ? (currentSong?.title ?? '') : (nowPlayingTitle || currentStation?.genre || '');
  const subtitle = mode === 'song' ? (currentSong?.artist ?? '') : (currentStation?.name ?? '');
  const showSkip = mode === 'song' && songQueue.length > 0;

  const handleTogglePlay = () => {
    if (mode === 'song') {
      songState === 'playing' ? pauseSong() : resumeSong();
    } else if (mode === 'radio' && currentStation) {
      isPlaying ? pause() : playStation(currentStation);
    }
  };

  const bigContent = (
    <>
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
          className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0"
          style={{ animation: 'hero-cover-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <RadioIcon className="text-white" size={48} />
          )}
        </div>

        <div
          className="flex items-center gap-2 mb-1 max-w-full"
          style={{ animation: 'hero-text-in 0.45s ease-out 0.15s both' }}
        >
          <h2 className="text-white font-serif font-bold text-lg md:text-xl truncate max-w-[80vw]">
            {title || 'Nema podataka'}
          </h2>
          {isPlayingNow && <NowPlayingIndicator />}
        </div>
        <p
          className="text-white/70 text-sm md:text-base truncate max-w-[80vw] mb-5"
          style={{ animation: 'hero-text-in 0.45s ease-out 0.22s both' }}
        >
          {subtitle}
        </p>

        <div
          className="flex items-center gap-4 md:gap-6"
          style={{ animation: 'hero-text-in 0.45s ease-out 0.3s both' }}
        >
          <button
            onClick={() => (volume > 0 ? setVolume(0) : setVolume(0.7))}
            className="text-white/70 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 md:w-28 h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-infinity-green-500"
          />

          <button
            onClick={handleTogglePlay}
            className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            {isPlayingNow ? (
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
    </>
  );

  const isGeometryAnimating = phase === 'opening' || phase === 'closing';

  return (
    <>
      <div ref={heroSlotRef}>
        {phase === 'expanded' && (
          <div
            ref={staticBoxRef}
            className={`relative w-full ${EXPANDED_HEIGHT} rounded-3xl overflow-hidden shadow-xl bg-gray-900 mb-6 md:mb-8`}
          >
            {contentReady && bigContent}
          </div>
        )}
      </div>

      {isGeometryAnimating && createPortal(
        <div
          className="fixed z-40 overflow-hidden shadow-2xl bg-gray-900"
          style={{
            top: rect?.top ?? 0,
            left: rect?.left ?? 0,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            borderRadius: radius,
            transition: `top ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), left ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), width ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), height ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), border-radius ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          {/* Small preview shown only while flying between the card and the slot */}
          <div className="absolute inset-0 flex items-center gap-3 px-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-infinity flex items-center justify-center">
              {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <RadioIcon className="text-white" size={22} />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
