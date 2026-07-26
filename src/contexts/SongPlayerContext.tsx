import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { useAudio } from './AudioContext';
import { youtubeSearch } from '../lib/api';

export interface SongInfo {
  title: string;
  artist: string;
  artwork: string;
  youtubeQuery: string;
  durationSeconds?: number;
}

export type SongState = 'idle' | 'loading' | 'playing' | 'paused' | 'queued';

interface SongPlayerContextType {
  songState: SongState;
  currentSong: SongInfo | null;
  songQueue: SongInfo[];
  postRadioQueue: SongInfo[];
  currentTime: number;
  duration: number;
  savedPlaylist: SongInfo[];
  playSong: (song: SongInfo) => void;
  playSongList: (songs: SongInfo[]) => void;
  queueSong: (song: SongInfo) => void;
  reorderQueue: (newFlatOrder: SongInfo[]) => void;
  stopSong: () => void;
  pauseSong: () => void;
  resumeSong: () => void;
  skipSong: () => void;
  seekTo: (seconds: number) => void;
  setQueuedAction: (action: (() => void) | null) => void;
  saveCurrentQueueAs: (songs: SongInfo[]) => void;
  clearSavedPlaylist: () => void;
  scheduleSwitch: (keepInQueue: number, action: () => void) => void;
  resumeSavedPlaylist: (immediate: boolean) => void;
}

const SongPlayerContext = createContext<SongPlayerContextType | undefined>(undefined);

let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiQueue: Array<() => void> = [];

function loadYouTubeAPI(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    ytApiQueue.push(resolve);
    if (!ytApiLoading) {
      ytApiLoading = true;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
      (window as any).onYouTubeIframeAPIReady = () => {
        ytApiLoaded = true;
        ytApiQueue.forEach(cb => cb());
        ytApiQueue.length = 0;
      };
    }
  });
}

function ytFade(player: any, from: number, to: number, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    const steps = Math.max(1, Math.round(durationMs / 40));
    const intervalMs = durationMs / steps;
    let step = 0;
    try { player.setVolume(from); } catch { resolve(); return; }
    const id = setInterval(() => {
      step++;
      const t = step / steps;
      const ease = t * t * (3 - 2 * t);
      try { player.setVolume(Math.round(from + (to - from) * ease)); } catch {}
      if (step >= steps) {
        clearInterval(id);
        try { player.setVolume(to); } catch {}
        resolve();
      }
    }, intervalMs);
  });
}

function ensurePlayerDiv(): void {
  if (!document.getElementById('yt-song-player')) {
    const div = document.createElement('div');
    div.id = 'yt-song-player';
    Object.assign(div.style, {
      position: 'fixed', width: '1px', height: '1px',
      opacity: '0', pointerEvents: 'none', bottom: '0', left: '0', zIndex: '-1',
    });
    document.body.appendChild(div);
  }
}

export function formatSongTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const CROSSFADE = 2500;
const CHAIN_FADE = 600;
const SKIP_FADE = 1500;

// Module-level cache: prefetch YouTube video IDs before a song starts playing
const videoIdCache = new Map<string, string[]>();

function videoCacheKey(song: SongInfo): string {
  return `${song.youtubeQuery}|${song.durationSeconds ?? 0}`;
}

function preloadVideoIds(song: SongInfo): void {
  const key = videoCacheKey(song);
  if (videoIdCache.has(key)) return;
  youtubeSearch.getVideoIds(song.youtubeQuery, song.durationSeconds)
    .then(ids => { if (ids.length > 0) videoIdCache.set(key, ids); })
    .catch(() => {});
}

function consumeVideoIds(song: SongInfo): string[] | null {
  const key = videoCacheKey(song);
  const ids = videoIdCache.get(key);
  if (!ids || ids.length === 0) return null;
  videoIdCache.delete(key);
  return ids;
}

export function SongPlayerProvider({ children }: { children: ReactNode }) {
  const { fadeRadioTo, setSongTransitionCallback, setSongActive, volume: radioUserVolume } = useAudio();

  const [songState, setSongState] = useState<SongState>('idle');
  const [currentSong, setCurrentSong] = useState<SongInfo | null>(null);
  const [songQueue, setSongQueue] = useState<SongInfo[]>([]);
  const [postRadioQueue, setPostRadioQueue] = useState<SongInfo[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [savedPlaylist, setSavedPlaylistState] = useState<SongInfo[]>([]);
  const savedPlaylistRef = useRef<SongInfo[]>([]);
  const currentSongRef = useRef<SongInfo | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const songGenRef = useRef(0);
  const radioUserVolumeRef = useRef(radioUserVolume);
  const songQueueRef = useRef<SongInfo[]>([]);
  const postRadioQueueRef = useRef<SongInfo[]>([]);
  const songStateRef = useRef<SongState>('idle');
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queuedActionRef = useRef<(() => void) | null>(null);
  const isCrossfadingRef = useRef(false);
  const playSongNowRef = useRef<((song: SongInfo, chaining?: boolean) => Promise<void>) | null>(null);
  const songEndHandledRef = useRef(false);
  const handleSongEndRef = useRef<((gen: number) => Promise<void>) | null>(null);

  // Preloaded next-song player
  const preloadedPlayerRef = useRef<any>(null);
  const preloadedSongRef = useRef<SongInfo | null>(null);
  const preloadedReadyRef = useRef<boolean>(false);
  const preloadGenRef = useRef<number>(0);
  const preloadNextSongPlayerRef = useRef<((song: SongInfo) => void) | null>(null);

  radioUserVolumeRef.current = radioUserVolume;
  songStateRef.current = songState;
  currentSongRef.current = currentSong;

  // Sync volume slider → YouTube when not crossfading. Debounced — dragging
  // the slider fires onChange on nearly every pixel of movement, and firing
  // a setVolume() postMessage to the YouTube iframe on every single tick can
  // flood its message channel badly enough that the player stops responding
  // to playVideo()/pauseVideo() afterward. Only the settled value matters.
  const volumeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isCrossfadingRef.current) return;
    if (!((songState === 'playing' || songState === 'paused') && ytPlayerRef.current)) return;
    if (volumeSyncTimerRef.current) clearTimeout(volumeSyncTimerRef.current);
    volumeSyncTimerRef.current = setTimeout(() => {
      try { ytPlayerRef.current?.setVolume(Math.round(radioUserVolume * 100)); } catch {}
    }, 80);
    return () => { if (volumeSyncTimerRef.current) clearTimeout(volumeSyncTimerRef.current); };
  }, [radioUserVolume, songState]);

  const startTimePolling = useCallback(() => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.() ?? 0;
        const d = p.getDuration?.() ?? 0;
        setCurrentTime(t);
        if (d > 0) setDuration(d);
        // Trigger crossfade 3 seconds before end (YouTube videos have silence at the tail)
        if (d > 6 && t >= d - 3 && !songEndHandledRef.current) {
          handleSongEndRef.current?.(songGenRef.current);
        }
      } catch {}
    }, 500);
  }, []);

  const stopTimePolling = useCallback(() => {
    if (timeIntervalRef.current) { clearInterval(timeIntervalRef.current); timeIntervalRef.current = null; }
  }, []);

  const destroyPlayer = useCallback(() => {
    stopTimePolling();
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
    const old = document.getElementById('yt-song-player');
    if (old) old.remove();
    setCurrentTime(0);
    setDuration(0);
  }, [stopTimePolling]);

  const destroyPreloaded = useCallback(() => {
    preloadGenRef.current++;
    if (preloadedPlayerRef.current) {
      try { preloadedPlayerRef.current.destroy(); } catch {}
      preloadedPlayerRef.current = null;
    }
    preloadedSongRef.current = null;
    preloadedReadyRef.current = false;
    const div = document.getElementById('yt-song-player-preload');
    if (div) div.remove();
  }, []);

  const preloadNextSongPlayer = useCallback(async (song: SongInfo) => {
    const key = videoCacheKey(song);
    if (preloadedSongRef.current && videoCacheKey(preloadedSongRef.current) === key) return;
    destroyPreloaded();
    const gen = ++preloadGenRef.current;
    preloadedSongRef.current = song;
    try {
      await loadYouTubeAPI();
      if (gen !== preloadGenRef.current) return;
      let ids = videoIdCache.get(key);
      if (!ids || ids.length === 0) {
        ids = await youtubeSearch.getVideoIds(song.youtubeQuery, song.durationSeconds);
        if (ids.length > 0) videoIdCache.set(key, ids);
      }
      if (!ids || !ids.length || gen !== preloadGenRef.current) return;
      if (!document.getElementById('yt-song-player-preload')) {
        const div = document.createElement('div');
        div.id = 'yt-song-player-preload';
        Object.assign(div.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', bottom: '0', left: '0', zIndex: '-1' });
        document.body.appendChild(div);
      }
      const YT = (window as any).YT;
      new YT.Player('yt-song-player-preload', {
        height: '1', width: '1', videoId: ids[0],
        // mute:1 → browser allows autoplay even on mobile (muted autoplay is always permitted)
        // origin must match the embedding page — without it the widget API can't validate
        // postMessage calls and the player can stop responding to later commands entirely.
        playerVars: { autoplay: 1, mute: 1, controls: 0, iv_load_policy: 3, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (e: any) => {
            if (gen !== preloadGenRef.current) { try { e.target.destroy(); } catch {}; return; }
            try { e.target.setVolume(0); } catch {}
            preloadedPlayerRef.current = e.target;
          },
          onStateChange: (e: any) => {
            if (gen !== preloadGenRef.current) return;
            if (e.data === 1 && !preloadedReadyRef.current) { // PLAYING = buffered and ready
              preloadedReadyRef.current = true;
              try { e.target.pauseVideo(); } catch {} // Freeze at ~0s, keep buffer hot
            }
          },
          onError: () => {
            if (gen === preloadGenRef.current) {
              preloadedPlayerRef.current = null;
              preloadedReadyRef.current = false;
            }
          },
        },
      });
    } catch { /* ignore preload errors */ }
  }, [destroyPreloaded]);

  preloadNextSongPlayerRef.current = preloadNextSongPlayer;

  const handleSongEnd = useCallback(async (gen: number) => {
    if (gen !== songGenRef.current) return;
    if (songEndHandledRef.current) return;
    songEndHandledRef.current = true;
    const player = ytPlayerRef.current;

    const nextSong = songQueueRef.current[0];
    if (nextSong) {
      songQueueRef.current = songQueueRef.current.slice(1);
      setSongQueue([...songQueueRef.current]);
      if (songQueueRef.current[0]) preloadVideoIds(songQueueRef.current[0]);
      stopTimePolling();

      // Fast path: preloaded player already ready for this song — instant crossfade
      const isPreloaded =
        preloadedReadyRef.current &&
        preloadedPlayerRef.current &&
        preloadedSongRef.current !== null &&
        videoCacheKey(preloadedSongRef.current) === videoCacheKey(nextSong);

      if (isPreloaded) {
        const nextPlayer = preloadedPlayerRef.current!;
        preloadedPlayerRef.current = null;
        preloadedReadyRef.current = false;
        preloadedSongRef.current = null;

        const newGen = ++songGenRef.current;
        // songEndHandledRef stays true during fade to block double-skip
        setCurrentSong(nextSong);
        setSongState('playing');
        setCurrentTime(0);
        setDuration(0);

        // nextPlayer's div still carries the 'yt-song-player-preload' id at this
        // point. Preloading the song after this one (below) calls
        // destroyPreloaded(), which removes whatever element currently holds
        // that id — claim a neutral id first so that doesn't tear the live,
        // actively-playing iframe out of the document out from under it.
        const nextPlayerDiv = document.getElementById('yt-song-player-preload');
        if (nextPlayerDiv) nextPlayerDiv.id = 'yt-song-player-live-pending';

        // Unmute (was muted for silent preload) and ensure volume starts at 0 for crossfade
        try { nextPlayer.unMute(); } catch {}
        try { nextPlayer.setVolume(0); } catch {}
        try { nextPlayer.playVideo(); } catch {} // Resume from buffered position ~0
        ytPlayerRef.current = nextPlayer;

        // Start preloading song after nextSong NOW — don't wait for crossfade to finish
        if (songQueueRef.current[0]) preloadNextSongPlayerRef.current?.(songQueueRef.current[0]);

        isCrossfadingRef.current = true;
        const targetVol = Math.round(radioUserVolumeRef.current * 100);
        await Promise.all([
          player ? ytFade(player, player.getVolume?.() ?? 100, 0, SKIP_FADE) : Promise.resolve(),
          ytFade(nextPlayer, 0, targetVol, SKIP_FADE),
        ]);
        isCrossfadingRef.current = false;

        if (newGen !== songGenRef.current) {
          try { if (player) player.destroy(); } catch {}
          return;
        }

        songEndHandledRef.current = false; // Reset only after fade so mid-fade skips are blocked

        if (player) { try { player.destroy(); } catch {} }
        const oldDiv = document.getElementById('yt-song-player');
        if (oldDiv) oldDiv.remove();
        const promotedDiv = document.getElementById('yt-song-player-live-pending');
        if (promotedDiv) promotedDiv.id = 'yt-song-player';

        try { const d = nextPlayer.getDuration?.() ?? 0; if (d > 0) setDuration(d); } catch {}
        startTimePolling();
        return;
      }

      // Slow path: preload not ready yet
      destroyPreloaded();
      try { player?.pauseVideo(); } catch {}
      if (player) await ytFade(player, player.getVolume?.() ?? 100, 0, CHAIN_FADE);
      if (gen !== songGenRef.current) return;
      destroyPlayer();
      playSongNowRef.current?.(nextSong, true);
      return;
    }

    // No more songs — crossfade back to radio
    stopTimePolling();
    setSongActive(false); // Tell AudioContext song is ending (fires pending jingle after 2.8s)
    await Promise.all([
      player ? ytFade(player, player.getVolume?.() ?? 100, 0, CROSSFADE) : Promise.resolve(),
      fadeRadioTo(radioUserVolumeRef.current, CROSSFADE),
    ]);
    if (gen !== songGenRef.current) return;
    destroyPlayer();

    // Set ref directly so queueSong sees 'idle' state immediately (before re-render)
    songStateRef.current = 'idle';
    setSongState('idle');
    setCurrentSong(null);

    const action = queuedActionRef.current;
    queuedActionRef.current = null;

    // Capture post-radio songs before action fires
    const postSongs = [...postRadioQueueRef.current];
    postRadioQueueRef.current = [];
    setPostRadioQueue([]);

    if (action) {
      action(); // Play the queued radio station

      // Queue post-radio songs to play after the next ICY song transition
      if (postSongs.length > 0) {
        songQueueRef.current = postSongs;
        setSongQueue([...postSongs]);
        songStateRef.current = 'queued';
        setSongState('queued');

        setSongTransitionCallback(() => {
          if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
          const next = songQueueRef.current[0];
          if (!next) return;
          songQueueRef.current = songQueueRef.current.slice(1);
          setSongQueue([...songQueueRef.current]);
          playSongNowRef.current?.(next);
        });

        if (!fallbackTimerRef.current) {
          fallbackTimerRef.current = setTimeout(() => {
            fallbackTimerRef.current = null;
            const next = songQueueRef.current[0];
            if (!next) return;
            setSongTransitionCallback(null);
            songQueueRef.current = songQueueRef.current.slice(1);
            setSongQueue([...songQueueRef.current]);
            playSongNowRef.current?.(next);
          }, 90_000);
        }
      }
    }
  }, [fadeRadioTo, destroyPlayer, stopTimePolling, setSongActive, setSongTransitionCallback]);

  handleSongEndRef.current = handleSongEnd;

  const playSongNow = useCallback(async (song: SongInfo, chaining = false) => {
    const gen = ++songGenRef.current;
    songEndHandledRef.current = false;
    setSongState('loading');
    setCurrentSong(song);
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    setSongActive(true);
    if (!chaining) radioUserVolumeRef.current = radioUserVolume;

    // Fast path: reuse the pre-buffered player — avoids creating a new YT player in a background
    // tab (browsers block new autoplay in background; resuming an existing player is allowed).
    const isPreloaded =
      preloadedReadyRef.current &&
      preloadedPlayerRef.current &&
      preloadedSongRef.current !== null &&
      videoCacheKey(preloadedSongRef.current) === videoCacheKey(song);

    if (isPreloaded) {
      const nextPlayer = preloadedPlayerRef.current!;
      preloadedPlayerRef.current = null;
      preloadedReadyRef.current = false;
      preloadedSongRef.current = null;

      destroyPlayer();
      const preloadDiv = document.getElementById('yt-song-player-preload');
      if (preloadDiv) preloadDiv.id = 'yt-song-player';
      ytPlayerRef.current = nextPlayer;

      try { nextPlayer.seekTo(0, true); } catch {}
      try { nextPlayer.unMute(); } catch {}
      try { nextPlayer.setVolume(0); } catch {}
      try { nextPlayer.playVideo(); } catch {}

      setSongState('playing');
      setCurrentTime(0);
      setDuration(0);

      if (songQueueRef.current[0]) preloadNextSongPlayerRef.current?.(songQueueRef.current[0]);

      isCrossfadingRef.current = true;
      const fastTargetVol = Math.round(radioUserVolumeRef.current * 100);
      await Promise.all([
        chaining ? Promise.resolve() : fadeRadioTo(0, CROSSFADE),
        ytFade(nextPlayer, 0, fastTargetVol, chaining ? CHAIN_FADE : CROSSFADE),
      ]);
      isCrossfadingRef.current = false;
      if (gen !== songGenRef.current) return;

      try { const d = nextPlayer.getDuration?.() ?? 0; if (d > 0) setDuration(d); } catch {}
      startTimePolling();
      return;
    }

    try {
      await loadYouTubeAPI();
      if (gen !== songGenRef.current) return;

      ensurePlayerDiv();
      const videoIds = consumeVideoIds(song) ?? await youtubeSearch.getVideoIds(song.youtubeQuery, song.durationSeconds);
      if (gen !== songGenRef.current) return;

      let played = false;
      for (let i = 0; i < Math.max(videoIds.length, 1); i++) {
        if (gen !== songGenRef.current) return;
        const vid = videoIds[i] ?? null;
        if (!vid) break;

        ensurePlayerDiv();

        const success = await new Promise<boolean>((resolve) => {
          const YT = (window as any).YT;
          const totalTimer = setTimeout(() => resolve(false), 20000);
          let crossfadeStarted = false;

          new YT.Player('yt-song-player', {
            height: '1', width: '1', videoId: vid,
            // mute:1 = browser always allows muted autoplay; we unmute in onStateChange once audio is ready
            // origin must match the embedding page — without it the widget API can't validate
            // postMessage calls and the player can stop responding to later commands entirely.
            playerVars: { autoplay: 1, mute: 1, controls: 0, iv_load_policy: 3, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
            events: {
              onReady: (e: any) => {
                if (gen !== songGenRef.current) { clearTimeout(totalTimer); try { e.target.destroy(); } catch {} resolve(false); return; }
                ytPlayerRef.current = e.target;
                try { e.target.playVideo(); } catch {}
                // Stay 'loading' until state=1 — muted autoplay fires reliably even without gesture context
              },
              onStateChange: async (e: any) => {
                if (gen !== songGenRef.current) return;
                if (e.data === 0) {
                  if (!songEndHandledRef.current) {
                    try { e.target.stopVideo(); } catch {}
                    handleSongEnd(gen);
                  }
                } else if (e.data === 1) {
                  // PLAYING — unmute and crossfade in
                  try { const d = e.target.getDuration?.() ?? 0; if (d > 0) setDuration(d); } catch {}
                  if (!crossfadeStarted) {
                    crossfadeStarted = true;
                    clearTimeout(totalTimer);
                    try { e.target.unMute(); } catch {}
                    try { e.target.setVolume(0); } catch {}
                    setSongState('playing');
                    // Start preloading next song immediately — gives it the full crossfade duration to buffer
                    if (songQueueRef.current[0]) preloadNextSongPlayerRef.current?.(songQueueRef.current[0]);
                    isCrossfadingRef.current = true;
                    const targetVol = Math.round(radioUserVolumeRef.current * 100);
                    await Promise.all([
                      chaining ? Promise.resolve() : fadeRadioTo(0, CROSSFADE),
                      ytFade(e.target, 0, targetVol, chaining ? CHAIN_FADE : CROSSFADE),
                    ]);
                    isCrossfadingRef.current = false;
                    if (gen !== songGenRef.current) return;
                    try { const d = e.target.getDuration?.() ?? 0; if (d > 0) setDuration(d); } catch {}
                    startTimePolling();
                    resolve(true);
                  }
                }
              },
              onError: () => {
                clearTimeout(totalTimer);
                try { ytPlayerRef.current = null; } catch {}
                if (gen !== songGenRef.current) { resolve(false); return; }
                resolve(false);
              },
            },
          });
        });

        if (success) { played = true; break; }
        destroyPlayer();
      }

      if (!played && gen === songGenRef.current) {
        setSongActive(false);
        setSongState('idle');
        setCurrentSong(null);
        if (!chaining) fadeRadioTo(radioUserVolumeRef.current, 1000);
        else fadeRadioTo(radioUserVolumeRef.current, CROSSFADE);
      }
    } catch {
      if (gen !== songGenRef.current) return;
      setSongActive(false);
      setSongState('idle');
      setCurrentSong(null);
      fadeRadioTo(radioUserVolumeRef.current, 1000);
    }
  }, [destroyPlayer, fadeRadioTo, handleSongEnd, radioUserVolume, startTimePolling, setSongActive]);

  playSongNowRef.current = playSongNow;

  const playSong = useCallback((song: SongInfo) => {
    setSongTransitionCallback(null);
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    songQueueRef.current = [];
    setSongQueue([]);
    postRadioQueueRef.current = [];
    setPostRadioQueue([]);
    queuedActionRef.current = null;
    destroyPreloaded();
    playSongNow(song);
  }, [playSongNow, setSongTransitionCallback, destroyPreloaded]);

  const queueSong = useCallback((song: SongInfo) => {
    const state = songStateRef.current;
    preloadVideoIds(song);

    if (state !== 'idle' && state !== 'queued') {
      // YouTube active
      if (queuedActionRef.current !== null) {
        // Radio interlude is pending — this song should play AFTER that radio interlude
        const q = [...postRadioQueueRef.current, song];
        postRadioQueueRef.current = q;
        setPostRadioQueue(q);
      } else {
        // No interlude — chain directly after current songs
        const wasEmpty = songQueueRef.current.length === 0;
        const q = [...songQueueRef.current, song];
        songQueueRef.current = q;
        setSongQueue(q);
        // Preload if this is the first song added to the chain
        if (wasEmpty) preloadNextSongPlayerRef.current?.(song);
      }
      return;
    }

    // Radio playing — use ICY metadata + 90s fallback
    const q = [...songQueueRef.current, song];
    songQueueRef.current = q;
    setSongQueue(q);
    if (state !== 'queued') {
      setSongState('queued');
      // Pre-buffer the player NOW while tab is in foreground — when ICY fires in background
      // the fast path in playSongNow can resume this player instead of creating a new one.
      preloadNextSongPlayerRef.current?.(song);
    }

    setSongTransitionCallback(() => {
      if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
      const next = songQueueRef.current[0];
      if (!next) return;
      songQueueRef.current = songQueueRef.current.slice(1);
      setSongQueue([...songQueueRef.current]);
      playSongNow(next);
    });

    if (!fallbackTimerRef.current) {
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        const next = songQueueRef.current[0];
        if (!next) return;
        setSongTransitionCallback(null);
        songQueueRef.current = songQueueRef.current.slice(1);
        setSongQueue([...songQueueRef.current]);
        playSongNow(next);
      }, 90_000);
    }
  }, [playSongNow, setSongTransitionCallback]);

  const stopSong = useCallback(async () => {
    const gen = ++songGenRef.current;
    setSongTransitionCallback(null);
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    songQueueRef.current = [];
    setSongQueue([]);
    postRadioQueueRef.current = [];
    setPostRadioQueue([]);
    queuedActionRef.current = null;
    setSongActive(false);
    destroyPreloaded();

    if (ytPlayerRef.current) {
      const player = ytPlayerRef.current;
      try { player.pauseVideo(); } catch {}
      await Promise.all([
        ytFade(player, player.getVolume?.() ?? 100, 0, 1200),
        fadeRadioTo(radioUserVolumeRef.current, 1200),
      ]);
      if (gen !== songGenRef.current) return;
      destroyPlayer();
    } else {
      fadeRadioTo(radioUserVolumeRef.current, 600);
    }
    setSongState('idle');
    setCurrentSong(null);
  }, [destroyPlayer, destroyPreloaded, fadeRadioTo, setSongTransitionCallback, setSongActive]);

  const pauseSong = useCallback(() => {
    if (ytPlayerRef.current && songStateRef.current === 'playing') {
      try { ytPlayerRef.current.pauseVideo(); } catch {}
      stopTimePolling();
      setSongState('paused');
    }
  }, [stopTimePolling]);

  const resumeSong = useCallback(() => {
    if (ytPlayerRef.current && songStateRef.current === 'paused') {
      try { ytPlayerRef.current.playVideo(); } catch {}
      startTimePolling();
      setSongState('playing');
    }
  }, [startTimePolling]);

  const skipSong = useCallback(() => {
    if (songStateRef.current !== 'playing' && songStateRef.current !== 'paused') return;
    if (songEndHandledRef.current) return;
    if (songStateRef.current === 'paused' && ytPlayerRef.current) {
      try { ytPlayerRef.current.playVideo(); } catch {}
    }
    handleSongEndRef.current?.(songGenRef.current);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(seconds, true); } catch {}
      setCurrentTime(seconds);
    }
  }, []);

  const reorderQueue = useCallback((newFlatOrder: SongInfo[]) => {
    const sqLen = songQueueRef.current.length;
    const newSQ = newFlatOrder.slice(0, sqLen);
    const newPRQ = newFlatOrder.slice(sqLen);
    songQueueRef.current = newSQ;
    setSongQueue(newSQ);
    postRadioQueueRef.current = newPRQ;
    setPostRadioQueue(newPRQ);

    // Reordering may have moved a different song to the front — make sure
    // that one is what's actually being preloaded, not whatever used to be
    // first (otherwise skipping to it hits the slow, un-preloaded path).
    const newFront = newSQ[0];
    if (newFront && (!preloadedSongRef.current || videoCacheKey(preloadedSongRef.current) !== videoCacheKey(newFront))) {
      preloadNextSongPlayerRef.current?.(newFront);
    }
  }, []);

  const setQueuedAction = useCallback((action: (() => void) | null) => {
    queuedActionRef.current = action;
  }, []);

  const saveCurrentQueueAs = useCallback((songs: SongInfo[]) => {
    savedPlaylistRef.current = songs;
    setSavedPlaylistState(songs);
  }, []);

  const clearSavedPlaylist = useCallback(() => {
    savedPlaylistRef.current = [];
    setSavedPlaylistState([]);
  }, []);

  // Keep keepInQueue songs in the active queue, save the rest, set action to fire when queue runs out
  const scheduleSwitch = useCallback((keepInQueue: number, action: () => void) => {
    const q = [...songQueueRef.current];
    const toSave = q.slice(keepInQueue);
    const toKeep = q.slice(0, keepInQueue);
    savedPlaylistRef.current = toSave;
    setSavedPlaylistState(toSave);
    songQueueRef.current = toKeep;
    setSongQueue(toKeep);
    postRadioQueueRef.current = [];
    setPostRadioQueue([]);
    queuedActionRef.current = action;
  }, []);

  // Play a list of songs: first song starts immediately, rest are queued
  const playSongList = useCallback((songs: SongInfo[]) => {
    if (!songs.length) return;
    const [first, ...rest] = songs;
    setSongTransitionCallback(null);
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    songQueueRef.current = rest;
    setSongQueue(rest);
    postRadioQueueRef.current = [];
    setPostRadioQueue([]);
    queuedActionRef.current = null;
    destroyPreloaded();
    playSongNow(first);
  }, [playSongNow, setSongTransitionCallback, destroyPreloaded]);

  const resumeSavedPlaylist = useCallback((immediate: boolean) => {
    const songs = [...savedPlaylistRef.current];
    if (!songs.length) return;
    savedPlaylistRef.current = [];
    setSavedPlaylistState([]);

    if (immediate) {
      playSongList(songs);
    } else {
      const state = songStateRef.current;
      if (state !== 'idle' && state !== 'queued') {
        // Song active — append after existing queue
        const newQ = [...songQueueRef.current, ...songs];
        songQueueRef.current = newQ;
        setSongQueue(newQ);
      } else {
        // Radio/idle — queue songs (first sets up ICY transition, rest append)
        songs.forEach(song => {
          const q = [...songQueueRef.current, song];
          songQueueRef.current = q;
          setSongQueue([...q]);
        });
        if (state !== 'queued') {
          setSongState('queued');
          songStateRef.current = 'queued';
          setSongTransitionCallback(() => {
            if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
            const next = songQueueRef.current[0];
            if (!next) return;
            songQueueRef.current = songQueueRef.current.slice(1);
            setSongQueue([...songQueueRef.current]);
            playSongNowRef.current?.(next);
          });
          if (!fallbackTimerRef.current) {
            fallbackTimerRef.current = setTimeout(() => {
              fallbackTimerRef.current = null;
              const next = songQueueRef.current[0];
              if (!next) return;
              setSongTransitionCallback(null);
              songQueueRef.current = songQueueRef.current.slice(1);
              setSongQueue([...songQueueRef.current]);
              playSongNowRef.current?.(next);
            }, 90_000);
          }
        }
      }
    }
  }, [playSongList, setSongTransitionCallback]);

  useEffect(() => {
    return () => {
      songGenRef.current++;
      setSongTransitionCallback(null);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      destroyPlayer();
      destroyPreloaded();
    };
  }, [destroyPlayer, destroyPreloaded, setSongTransitionCallback]);

  // Resume playback when tab becomes visible — YouTube autoplay is blocked in background tabs
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const p = ytPlayerRef.current;
      if (!p) return;
      const s = songStateRef.current;
      if (s !== 'playing' && s !== 'loading') return;
      try {
        const ytState = p.getPlayerState?.();
        if (ytState !== 1 && ytState !== 3) p.playVideo(); // not PLAYING or BUFFERING
      } catch {}
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, []);

  return (
    <SongPlayerContext.Provider value={{
      songState, currentSong, songQueue, postRadioQueue,
      currentTime, duration, savedPlaylist,
      playSong, playSongList, queueSong, reorderQueue, stopSong,
      pauseSong, resumeSong, skipSong, seekTo, setQueuedAction,
      saveCurrentQueueAs, clearSavedPlaylist, scheduleSwitch, resumeSavedPlaylist,
    }}>
      {children}
    </SongPlayerContext.Provider>
  );
}

export function useSongPlayer() {
  const ctx = useContext(SongPlayerContext);
  if (!ctx) throw new Error('useSongPlayer mora biti korišćen unutar SongPlayerProvider');
  return ctx;
}
