import { useEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Volume2, VolumeX, SkipForward, Radio as RadioIcon, X, Ban, Mic2 } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer } from '../../contexts/SongPlayerContext';
import NowPlayingIndicator from '../player/NowPlayingIndicator';
import VolumeSlider from '../player/VolumeSlider';
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
const ANIM_MS = 780;         // the box's up/down glide, camera tracking it centered
const CAMERA_PAN_MS = 520;   // a pure camera move (scroll) to frame a target before/after a glide
const SWITCH_PAUSE_MS = 320; // breathing room after the old station lands, before the camera moves on
const FOCUS_HOLD_MS = 520;   // how long the camera holds centered on the just-clicked station before it climbs
const LAND_SETTLE_MS = 200;  // soft-landing beat: lift-shadow relaxing into the resting shadow on touchdown
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // smooth "expo-out" glide (used for the box-shadow relax)
const EXPANDED_HEIGHT = 'h-[400px] md:h-[424px]';
const EXPANDED_RADIUS = 24; // matches Tailwind's rounded-3xl, used for FLIP math
const FLY_SHADOW = '0 30px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)';
const SETTLED_SHADOW = '0 20px 40px -16px rgba(0,0,0,0.4)';

function heroHeight() {
  return window.innerWidth < 768 ? 400 : 424;
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

// A rect in DOCUMENT space (top includes scroll), so it stays meaningful while
// the page scrolls underneath. The fixed overlay's on-screen position is then
// just `doc.top - scrollY`.
type DocRect = Rect;
function docRectOf(el: HTMLElement): DocRect {
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left, width: r.width, height: r.height };
}
// Scroll position that puts a document rect's vertical centre in the middle of
// the viewport (clamped to the scrollable range).
function centerScrollFor(doc: DocRect): number {
  return clampNum(doc.top + doc.height / 2 - window.innerHeight / 2, 0, maxScrollY());
}

// Only exists in the DOM while something is playing (or was just paused, inside
// the grace window). It rises from the clicked card into the hero slot as a
// `position: fixed` overlay driven by a requestAnimationFrame tween that moves
// the box AND the page scroll together — so the camera tracks the box and keeps
// the action in the middle of the screen the whole way. Once expanded it settles
// into an ordinary in-flow static block that scrolls with the page. Reverting
// (pause + 10s, or a station switch) plays it backwards: the camera pans up to
// the playing station, then it glides back down onto its own grid slot with the
// camera following. A switch chains both halves — old station down, then the
// camera frames the newly clicked one and it climbs up.
export default function HeroPlayer({ heroSlotRef, getStationOriginEl, getDjOriginEl, onHiddenStationChange }: HeroPlayerProps) {
  const { currentStation, isPlaying, pause, playStation, volume, setVolume, nowPlayingTitle, nowPlayingCover, nowPlayingPrevious, nowPlayingIsJingle, isNowBlocked, blockCurrentSong, blockCurrentArtist, skipRadioTrack } = useAudio();
  const [radioSkipping, setRadioSkipping] = useState(false);
  const handleSkipRadio = async () => {
    setRadioSkipping(true);
    const res = await skipRadioTrack();
    setRadioSkipping(false);
    flashBlockMsg(res && res.ok ? 'Preskočeno — nova pesma stiže' : 'Skip trenutno ne radi');
  };
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const blockMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashBlockMsg = (msg: string) => {
    setBlockMsg(msg);
    if (blockMsgTimerRef.current) clearTimeout(blockMsgTimerRef.current);
    blockMsgTimerRef.current = setTimeout(() => setBlockMsg(null), 2500);
  };
  useEffect(() => () => { if (blockMsgTimerRef.current) clearTimeout(blockMsgTimerRef.current); }, []);

  const handleBlockSong = async () => { await blockCurrentSong(); flashBlockMsg('Pesma blokirana'); };
  const handleBlockArtist = async () => { await blockCurrentArtist(); flashBlockMsg('Izvođač blokiran'); };
  const { songState, currentSong, pauseSong, resumeSong, skipSong, stopSong, songQueue, currentTime, duration, seekTo } = useSongPlayer();

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

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const staticBoxRef = useRef<HTMLDivElement>(null);
  const flyBoxRef = useRef<HTMLDivElement>(null);
  const displayedRef = useRef<Displayed>(null);
  const currentStationIdRef = useRef<string | null>(null);
  currentStationIdRef.current = currentStation?.id ?? null;

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

  const cancelRaf = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };
  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    cancelRaf();
  };
  const after = (ms: number, fn: () => void) => {
    timeoutsRef.current.push(setTimeout(fn, ms));
  };

  // --- rAF tweening: box position + page scroll driven together per frame ---

  const tween = (duration: number, onFrame: (e: number) => void, onDone?: () => void) => {
    cancelRaf();
    const start = performance.now();
    const step = (now: number) => {
      const e = easeOutExpo(Math.min(1, (now - start) / duration));
      onFrame(e);
      if (e < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Commit one animation frame: move the page scroll and the box together, in
  // lockstep. The box's on-screen rect is written straight to the DOM node (so
  // it's perfectly in sync with the scroll this very frame, no React-commit
  // lag), AND mirrored into state so any unrelated re-render mid-flight can't
  // snap the box back to a stale position.
  const applyFrame = (doc: DocRect, s: number, r: number) => {
    window.scrollTo(0, s);
    // The browser clamps scroll to the real scrollable range, which can differ
    // from our requested `s` — e.g. once the hero slot collapses the page gets
    // shorter, and on a big desktop screen the page is barely scrollable at all.
    // Position the box against the ACTUAL post-clamp scroll so it stays glued to
    // the card's true on-screen spot instead of drifting off onto another slot.
    const actual = window.scrollY;
    const vp: Rect = { top: doc.top - actual, left: doc.left, width: doc.width, height: doc.height };
    const el = flyBoxRef.current;
    if (el) {
      el.style.top = `${vp.top}px`;
      el.style.left = `${vp.left}px`;
      el.style.width = `${vp.width}px`;
      el.style.height = `${vp.height}px`;
      el.style.borderRadius = `${r}px`;
    }
    setRect(vp);
    setRadius(r);
  };

  // Pure camera move: the box stays glued to a fixed document spot while the
  // page scroll eases from wherever it is to `targetScroll`. Used to pan up to
  // the currently playing station before it descends.
  const panWithBox = (doc: DocRect, targetScroll: number, duration: number, onDone: () => void) => {
    const s0 = window.scrollY;
    if (Math.abs(targetScroll - s0) < 2) { onDone(); return; }
    tween(duration, (e) => applyFrame(doc, lerp(s0, targetScroll, e), EXPANDED_RADIUS), onDone);
  };

  // Pure camera move with no box on screen (used before a climb, while the grid
  // card still sits in place): just eases the page scroll to frame `doc`.
  const panScrollOnly = (doc: DocRect, duration: number, onDone: () => void) => {
    const s0 = window.scrollY;
    const s1 = centerScrollFor(doc);
    if (Math.abs(s1 - s0) < 2) { onDone(); return; }
    tween(duration, (e) => window.scrollTo(0, lerp(s0, s1, e)), onDone);
  };

  // The tracking glide: the box travels from `fromDoc` to `toDoc` in document
  // space while the scroll follows to keep the box centred — so it stays in the
  // middle of the screen the whole way instead of sliding off to an edge.
  const trackGlide = (
    fromDoc: DocRect, toDoc: DocRect,
    fromRadius: number, toRadius: number,
    duration: number, onDone: () => void,
  ) => {
    tween(duration, (e) => {
      const d: DocRect = {
        top: lerp(fromDoc.top, toDoc.top, e),
        left: lerp(fromDoc.left, toDoc.left, e),
        width: lerp(fromDoc.width, toDoc.width, e),
        height: lerp(fromDoc.height, toDoc.height, e),
      };
      applyFrame(d, centerScrollFor(d), lerp(fromRadius, toRadius, e));
    }, onDone);
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

  // The climb itself: spawn the box on the origin card (already framed by the
  // camera) and glide it up into the hero slot, camera tracking it centred all
  // the way. `fromDoc` is the card's document rect; `hideId` is the grid card to
  // hide the instant the box takes its place, so it reads as the card lifting
  // out of the grid rather than a duplicate appearing.
  const runClimb = (fromDoc: DocRect, hideId: string | null) => {
    const target = targetRect(); // hero slot, in document space
    // Spawn the fixed box exactly over the (framed) card.
    setRect({ top: fromDoc.top - window.scrollY, left: fromDoc.left, width: fromDoc.width, height: fromDoc.height });
    setRadius(20);
    if (hideId) setHiddenStationId(hideId); // lift the card out exactly as the box takes its spot
    setFlying(true);
    setContentReady(false);
    setPhase('opening');

    trackGlide(fromDoc, target, 20, 28, ANIM_MS, () => {
      setPhase('expanded');
      setFlying(false);
      setContentReady(true);
    });
  };

  const openFromOrigin = (
    fromEl: HTMLElement | null,
    opts?: { focusFirst?: boolean; hideId?: string | null },
  ) => {
    clearTimeouts();
    const hideId = opts?.hideId ?? null;
    if (!fromEl) {
      // No known origin — climb up from just below the hero slot.
      const target = targetRect();
      runClimb({ top: target.top + 40, left: target.left, width: target.width, height: target.height * 0.7 }, hideId);
      return;
    }
    // Beat: pan the camera so the just-clicked station sits centred, then climb.
    // On a switch we hold a beat there so it's clear WHICH card is about to rise.
    panScrollOnly(docRectOf(fromEl), CAMERA_PAN_MS, () => {
      const start = () => runClimb(docRectOf(fromEl), hideId);
      if (opts?.focusFirst) after(FOCUS_HOLD_MS, start); else start();
    });
  };

  const closeToOrigin = (toEl: HTMLElement | null, onDone: () => void) => {
    clearTimeouts();
    // The hero has been an ordinary in-flow block while expanded, so it may
    // have scrolled anywhere — capture its real document position and hand off
    // to the fixed overlay at exactly that spot (no visible jump).
    const liveRect = staticBoxRef.current?.getBoundingClientRect();
    const heroDoc: DocRect = liveRect
      ? { top: liveRect.top + window.scrollY, left: liveRect.left, width: liveRect.width, height: liveRect.height }
      : targetRect();
    setRect({ top: heroDoc.top - window.scrollY, left: heroDoc.left, width: heroDoc.width, height: heroDoc.height });
    setRadius(EXPANDED_RADIUS);
    setFlying(true);
    setContentReady(false);
    setPhase('closing');

    if (toEl) {
      // Beat 1 — the camera pans UP to the currently playing station (the box
      // stays glued to it) so we're looking right at it before it moves.
      panWithBox(heroDoc, centerScrollFor(heroDoc), CAMERA_PAN_MS, () => {
        // Beat 2 — measure the destination card and glide the box down onto it,
        // the camera tracking it centred the whole way, so it lands exactly on
        // its own (empty) slot in the middle of the screen.
        //
        // IMPORTANT: measure only AFTER the hero-slot collapse (phase→'closing')
        // has actually committed and the grid has reflowed up. When the pan
        // short-circuits synchronously — which it does whenever the hero is
        // already centred, the usual case on the 10s pause return — measuring
        // right here would read the card's PRE-collapse position (~a full card
        // too low) and land the box on the neighbouring slot. One rAF lets React
        // paint the collapse first so getBoundingClientRect() is truthful.
        const startGlide = () => {
          const cardDoc = docRectOf(toEl);
          trackGlide(heroDoc, cardDoc, EXPANDED_RADIUS, 20, ANIM_MS, () => {
            // Corrective snap: if the grid nudged during the glide, re-measure
            // and settle dead-on the real slot before revealing the card.
            const settled = docRectOf(toEl);
            applyFrame(settled, centerScrollFor(settled), 20);
            // Soft landing: let the lift-shadow relax into the resting shadow —
            // a subtle "weight settling" beat — before handing off to the card.
            setFlying(false);
            after(LAND_SETTLE_MS, () => { setPhase('closed'); setRect(null); onDone(); });
          });
        };
        requestAnimationFrame(() => requestAnimationFrame(startGlide));
      });
    } else {
      // No known origin — just shrink/fade in place.
      trackGlide(
        heroDoc,
        { top: heroDoc.top + 24, left: heroDoc.left, width: heroDoc.width, height: heroDoc.height * 0.6 },
        EXPANDED_RADIUS, 20, ANIM_MS,
        () => { setFlying(false); after(LAND_SETTLE_MS, () => { setPhase('closed'); setRect(null); onDone(); }); },
      );
    }
  };

  // Open (grow) / close (shrink) transitions
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      if (mode === 'radio' && currentStation) {
        displayedRef.current = { mode: 'radio', id: currentStation.id };
        openFromOrigin(getStationOriginEl(currentStation.id), { hideId: currentStation.id });
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
      // Beat 1 — the old station glides back down onto its own (empty) slot.
      closeToOrigin(getStationOriginEl(oldId), () => {
        // Reveal the old card the instant the box finishes landing on it —
        // it was hidden (opacity 0, same reserved slot) the whole time it was
        // up in the player, so up to now the box was shrinking down onto a
        // spot with nothing visible there. Un-hiding it here is what sells
        // "this is the card, back in place" instead of landing on a
        // contextless blank spot in the grid.
        setHiddenStationId(null);
        // Then let it sit visibly settled for a beat before the camera moves
        // on — otherwise the "returned to its place" moment barely registers.
        after(SWITCH_PAUSE_MS, () => {
          // Re-read the current station rather than closing over the id from
          // when this effect fired — if the user clicked another station
          // again during the pause, this makes sure we fly up to wherever
          // they actually ended up, not a now-stale target.
          const latestId = currentStationIdRef.current;
          if (!latestId) return;
          displayedRef.current = { mode: 'radio', id: latestId };
          // Beat 2 (camera pans to the new card) + Beat 3 (it climbs up). The
          // new card stays visible during the pan and is hidden only at the
          // moment it lifts out — handled inside openFromOrigin/runClimb.
          openFromOrigin(getStationOriginEl(latestId), { focusFirst: true, hideId: latestId });
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStation?.id]);

  useEffect(() => () => clearTimeouts(), []);

  const isJingle = mode === 'radio' && nowPlayingIsJingle;
  const cover = mode === 'song' ? currentSong?.artwork ?? null : nowPlayingCover;
  const title = mode === 'song' ? (currentSong?.title ?? '') : (nowPlayingTitle || currentStation?.genre || '');
  const subtitle = mode === 'song' ? (currentSong?.artist ?? '') : (isJingle ? 'Džingl' : (currentStation?.name ?? ''));
  const showSkip = mode === 'song' && songQueue.length > 0;
  const isMojRadio = mode === 'radio' && !!currentStation && currentStation.id.startsWith('moj-radio-');
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

      {/* Previously played track — a smaller, muted echo of the main card,
          floated on the left so the current track stays perfectly centred.
          Only on radio (a "previous song" is a live-stream concept). Scales
          down on phones (narrow player) so it stays clear of the centre. */}
      {mode === 'radio' && nowPlayingPrevious && (
        <div
          className="flex absolute left-2 md:left-5 lg:left-8 top-3 md:top-1/2 md:-translate-y-1/2 z-10 flex-col items-center gap-1.5 md:gap-2 w-[76px] md:w-36 lg:w-40 text-center pointer-events-none"
          style={{ animation: 'hero-text-in 0.6s ease-out 0.2s both' }}
        >
          <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.15em] md:tracking-[0.18em] text-white/40">
            Prethodna
          </span>
          <div className="w-11 h-11 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-gradient-infinity flex items-center justify-center opacity-80">
            {nowPlayingPrevious.cover ? (
              <img src={nowPlayingPrevious.cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <RadioIcon className="text-white/70" size={22} />
            )}
          </div>
          <p className="text-[10px] md:text-xs text-white/60 leading-snug line-clamp-2 break-words w-full">
            {nowPlayingPrevious.title}
          </p>
        </div>
      )}

      <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 text-center">
        <div
          className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0"
          style={{ animation: 'hero-cover-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : isJingle ? (
            <Mic2 className="text-white" size={44} />
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
          className="text-white font-serif font-bold text-lg md:text-xl w-full mb-1 break-words px-2 leading-snug"
          style={{ animation: 'hero-text-in 0.5s ease-out 0.16s both' }}
        >
          {title || 'Nema podataka'}
        </h2>
        <p
          className={`text-sm md:text-base w-full mb-5 break-words px-2 leading-snug ${isLoadingSong ? 'text-infinity-green-400 animate-pulse' : 'text-white/70'}`}
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
          <VolumeSlider value={volume} onChange={setVolume} className="w-20 md:w-28" />

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
          ) : isMojRadio ? (
            <button
              onClick={handleSkipRadio}
              disabled={radioSkipping}
              className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
              title="Preskoči pesmu"
            >
              {radioSkipping ? (
                <div className="w-[18px] h-[18px] border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              ) : (
                <SkipForward size={22} />
              )}
            </button>
          ) : (
            <div className="w-[22px]" />
          )}
        </div>

        {mode === 'radio' && nowPlayingTitle && (
          <div className="mt-5 flex flex-col items-center gap-2.5" style={{ animation: 'hero-text-in 0.5s ease-out 0.4s both' }}>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleBlockSong}
                title="Blokiraj ovu pesmu (samo za tebe)"
                className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-50 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/60 shadow-lg shadow-red-900/20 backdrop-blur-sm hover:scale-[1.04] active:scale-95 transition-all duration-200"
              >
                <Ban size={17} className="group-hover:rotate-12 transition-transform" />
                Blokiraj pesmu
              </button>
              <button
                onClick={handleBlockArtist}
                title="Blokiraj ovog izvođača (samo za tebe)"
                className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-50 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/60 shadow-lg shadow-red-900/20 backdrop-blur-sm hover:scale-[1.04] active:scale-95 transition-all duration-200"
              >
                <Ban size={17} className="group-hover:rotate-12 transition-transform" />
                Blokiraj izvođača
              </button>
            </div>
            {blockMsg && <span className="text-xs text-infinity-green-400 font-semibold animate-pulse">{blockMsg}</span>}
            {isNowBlocked && !blockMsg && (
              <span className="text-xs text-amber-400/90 font-medium">Blokirano — čeka se sledeća pesma</span>
            )}
          </div>
        )}

        {mode === 'song' && duration > 0 && (
          <div
            className="w-full max-w-xs mt-4"
            style={{ animation: 'hero-text-in 0.5s ease-out 0.4s both' }}
          >
            <div
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                seekTo(ratio * duration);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-infinity-green-500 rounded-full"
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${Math.min(100, (currentTime / duration) * 100)}% - 6px)` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/50 font-medium tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
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
              isPlaylistMode ? 'h-[560px] md:h-[424px]' : EXPANDED_HEIGHT
            }`}
            // clip-path reliably clips the blurred cover background (whose blur
            // halo spills past the edge) to the rounded corners on iOS/Safari —
            // plain overflow-hidden + border-radius doesn't clip filtered layers.
            style={{ boxShadow: SETTLED_SHADOW, clipPath: 'inset(0 round 24px)', transform: 'translateZ(0)' }}
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
          ref={flyBoxRef}
          className="fixed z-40 overflow-hidden bg-gray-900"
          style={{
            top: rect?.top ?? 0,
            left: rect?.left ?? 0,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            borderRadius: radius,
            boxShadow: flying ? FLY_SHADOW : SETTLED_SHADOW,
            // Geometry (top/left/width/height/radius) is driven frame-by-frame
            // by the rAF tween, so it must NOT have a CSS transition fighting it.
            // Only the shadow eases — that's the soft-landing "settle".
            transition: `box-shadow ${LAND_SETTLE_MS}ms ${EASE}`,
            willChange: 'top, left, width, height',
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
