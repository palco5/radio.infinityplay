import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { RadioStation, UserJingle } from '../types';
import { useAuth } from './AuthContext';
import { profiles as profilesApi, nowplaying as nowplayingApi } from '../lib/api';
import { JingleRotationManager } from '../lib/jingleManager';

interface AudioContextType {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  volume: number;
  nowPlayingTitle: string;
  nowPlayingCover: string | null;
  playStation: (station: RadioStation) => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  playJingle: (url: string, volumeBoostDb?: number) => Promise<void>;
  updateJingles: (jingles: UserJingle[]) => void;
  fadeRadioTo: (volume: number, duration?: number) => void;
  setSongTransitionCallback: (cb: (() => void) | null) => void;
  setSongActive: (active: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [nowPlayingTitle, setNowPlayingTitle] = useState('');
  const [nowPlayingCover, setNowPlayingCover] = useState<string | null>(null);

  // Mirror volume state in a ref so async callbacks always read the live value
  const volumeRef = useRef(0.7);

  // Dual-deck system for true crossfade
  const audioRef1 = useRef<HTMLAudioElement | null>(null);
  const audioRef2 = useRef<HTMLAudioElement | null>(null);
  const activeDeckRef = useRef<1 | 2>(1);

  const userIdRef = useRef<string | null>(null);
  const listeningStartTime = useRef<number | null>(null);

  // Jingle system
  const jingleManagerRef = useRef<JingleRotationManager | null>(null);
  const jingleCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Active jingle element — killed immediately on station switch or pause
  const jingleAudioRef = useRef<HTMLAudioElement | null>(null);
  // Track current station id to skip jingles on Moj Radio streams
  const currentStationIdRef = useRef<string | null>(null);
  // Song title polling for songs-based jingle scheduling
  const currentStreamUrlRef = useRef<string | null>(null);
  const songTitleRef = useRef<string>('');
  const songPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Jingle waiting for next song transition (songs mode)
  const jingleReadyRef = useRef<import('../types').UserJingle | null>(null);
  // Timestamp when jingleReadyRef was set (for timeout fallback)
  const jingleReadyAtRef = useRef<number>(0);
  // Preloaded audio element for the queued jingle
  const jinglePreloadRef = useRef<HTMLAudioElement | null>(null);
  // Whether the current station's stream returns ICY metadata
  const icyAvailableRef = useRef<boolean>(false);

  // Generation counter — increments on every playStation/pause call.
  // Lets async jingle playback detect it has become stale.
  const playGenRef = useRef<number>(0);

  // Song player callback — fires on ICY song transition, used by SongPlayerContext
  const songTransitionCallbackRef = useRef<(() => void) | null>(null);

  // Whether a YouTube song is currently active (used to suppress jingle firing during song)
  const isSongActiveRef = useRef(false);
  // Ref to fireReadyJingle so setSongActive can call it stably
  const fireReadyJingleRef = useRef<((jingle: import('../types').UserJingle) => void) | null>(null);
  // Ref to pollCurrentTitle — updated each render so timeupdate handler always calls latest closure
  const pollCurrentTitleRef = useRef<() => Promise<void>>(async () => {});
  // Throttle timestamp for timeupdate-driven ICY polling
  const icyPollThrottleRef = useRef(0);

  useEffect(() => {
    if (user) {
      userIdRef.current = user.id;
      if (!jingleManagerRef.current) {
        jingleManagerRef.current = new JingleRotationManager([]);
      }
    } else {
      userIdRef.current = null;
    }
  }, [user]);

  useEffect(() => {
    if (!audioRef1.current) audioRef1.current = new Audio();
    if (!audioRef2.current) audioRef2.current = new Audio();

    audioRef1.current.volume = volumeRef.current;
    audioRef2.current.volume = volumeRef.current;

    // Audio timeupdate events fire even in background tabs (media is exempt from throttling).
    // Use them to drive ICY polling so queued songs and jingles trigger on time in background.
    const handleIcyPoll = () => {
      if (!songTransitionCallbackRef.current && !jingleReadyRef.current) return;
      const now = Date.now();
      if (now - icyPollThrottleRef.current < 3000) return;
      icyPollThrottleRef.current = now;
      pollCurrentTitleRef.current();
    };
    audioRef1.current.addEventListener('timeupdate', handleIcyPoll);
    audioRef2.current.addEventListener('timeupdate', handleIcyPoll);

    return () => {
      audioRef1.current?.removeEventListener('timeupdate', handleIcyPoll);
      audioRef2.current?.removeEventListener('timeupdate', handleIcyPoll);
      if (audioRef1.current) { audioRef1.current.pause(); audioRef1.current.src = ''; }
      if (audioRef2.current) { audioRef2.current.pause(); audioRef2.current.src = ''; }
      if (jingleCheckIntervalRef.current) clearInterval(jingleCheckIntervalRef.current);
      if (jingleAudioRef.current) { jingleAudioRef.current.pause(); jingleAudioRef.current.src = ''; }
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      updateListeningTime();
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentStation) {
      listeningStartTime.current = Date.now();
    } else {
      updateListeningTime();
    }
  }, [isPlaying, currentStation]);

  // Poll now-playing title + cover art for display purposes (independent of jingle scheduling).
  useEffect(() => {
    if (!isPlaying || !currentStation) {
      setNowPlayingTitle('');
      setNowPlayingCover(null);
      return;
    }

    let cancelled = false;
    const fetchInfo = async () => {
      const info = await nowplayingApi.getInfo(currentStation.stream_url);
      if (cancelled) return;
      setNowPlayingTitle(info.title);
      setNowPlayingCover(info.coverart);
    };

    fetchInfo();
    const id = setInterval(fetchInfo, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isPlaying, currentStation]);

  const updateListeningTime = async () => {
    if (listeningStartTime.current && userIdRef.current) {
      const minutesListened = Math.floor((Date.now() - listeningStartTime.current) / 60000);
      if (minutesListened > 0) {
        try {
          const profile = await profilesApi.getById(userIdRef.current);
          if (profile) {
            const newTotal = (profile.total_listening_minutes || 0) + minutesListened;
            await profilesApi.update(userIdRef.current, { total_listening_minutes: newTotal });
          }
        } catch (error) {
          console.error('Failed to update listening time:', error);
        }
      }
      listeningStartTime.current = null;
    }
  };

  // Equal-power fade curves — sin/cos ensure constant perceived loudness at crossfade midpoint
  const fadeOut = (audio: HTMLAudioElement, duration: number = 1500): Promise<void> => {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      if (startVolume === 0) { resolve(); return; }
      const steps = 50;
      const stepDuration = duration / steps;
      let step = 0;

      const id = setInterval(() => {
        step++;
        const progress = step / steps;
        audio.volume = Math.max(0, startVolume * Math.cos(progress * Math.PI / 2));
        if (step >= steps) {
          clearInterval(id);
          audio.volume = 0;
          resolve();
        }
      }, stepDuration);
    });
  };

  const fadeIn = (audio: HTMLAudioElement, targetVolume: number, duration: number = 1500): Promise<void> => {
    return new Promise((resolve) => {
      audio.volume = 0;
      const steps = 50;
      const stepDuration = duration / steps;
      let step = 0;

      const id = setInterval(() => {
        step++;
        const progress = step / steps;
        audio.volume = Math.min(targetVolume, targetVolume * Math.sin(progress * Math.PI / 2));
        if (step >= steps) {
          clearInterval(id);
          audio.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  };

  // Fade from current volume to any target — used for ducking/unducking
  const fadeTo = (audio: HTMLAudioElement, targetVolume: number, duration: number = 1000): Promise<void> => {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      if (Math.abs(startVolume - targetVolume) < 0.001) { audio.volume = targetVolume; resolve(); return; }
      const steps = 50;
      const stepDuration = duration / steps;
      let step = 0;

      const id = setInterval(() => {
        step++;
        const t = step / steps;
        // Smooth-step easing: feels natural for volume changes
        const ease = t * t * (3 - 2 * t);
        audio.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * ease));
        if (step >= steps) {
          clearInterval(id);
          audio.volume = Math.max(0, Math.min(1, targetVolume));
          resolve();
        }
      }, stepDuration);
    });
  };

  const getJingleUrl = (jingle: import('../types').UserJingle) =>
    jingle.jingle_data
      ? `data:audio/mpeg;base64,${jingle.jingle_data}`
      : jingle.cloudinary_url || '';

  const checkForJingle = () => {
    if (!isPlayingRef.current || !jingleManagerRef.current) return;
    if (currentStationIdRef.current?.startsWith('moj-radio-')) return;
    if (jingleReadyRef.current) return; // Already waiting for next transition
    if (isSongActiveRef.current) return; // Never fire jingles while YouTube song is playing

    const jingle = jingleManagerRef.current.shouldPlayJingle();
    if (!jingle) return;

    const url = getJingleUrl(jingle);

    if (jingle.schedule_type === 'songs' && icyAvailableRef.current) {
      // Songs mode + ICY works: wait for next song boundary to play between songs
      jingleReadyRef.current = jingle;
      jingleReadyAtRef.current = Date.now();
      // Preload the jingle now so it's ready to fire instantly at transition
      if (url) {
        const pre = new Audio(url);
        pre.preload = 'auto';
        pre.load();
        jinglePreloadRef.current = pre;
      }
      // Switch to fast polling (3s)
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(pollCurrentTitle, 3000);
    } else {
      // Interval mode OR songs mode without ICY: play immediately
      if (!url) { jingleManagerRef.current.markPlayed(jingle.id); return; }
      playJingle(url, jingle.volume_boost_db || 0)
        .then(() => { jingleManagerRef.current?.markPlayed(jingle.id); })
        .catch((err) => console.error('❌ Jingle playback failed:', err));
    }
  };

  const fireReadyJingle = (jingle: import('../types').UserJingle) => {
    jingleReadyRef.current = null;
    jingleReadyAtRef.current = 0;
    jingleManagerRef.current?.markPlayed(jingle.id);
    const url = getJingleUrl(jingle);
    if (!url) return;
    // Use preloaded audio if available, otherwise let playJingle load it
    const preloaded = jinglePreloadRef.current;
    jinglePreloadRef.current = null;
    playJingle(url, jingle.volume_boost_db || 0, preloaded ?? undefined).catch(console.error);
    if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
    songPollIntervalRef.current = setInterval(pollCurrentTitle, 30000);
  };

  const pollCurrentTitle = async () => {
    if (!isPlayingRef.current || !currentStreamUrlRef.current) return;
    if (currentStationIdRef.current?.startsWith('moj-radio-')) return;

    // Timeout fallback: if jingle was ready for > 3 min without a detected transition, play it now
    if (jingleReadyRef.current && jingleReadyAtRef.current &&
        (Date.now() - jingleReadyAtRef.current) > 180_000 && !isSongActiveRef.current) {
      fireReadyJingle(jingleReadyRef.current);
      return;
    }

    const title = await nowplayingApi.getTitle(currentStreamUrlRef.current);
    if (title) icyAvailableRef.current = true;
    if (!title) return;

    if (songTitleRef.current && title !== songTitleRef.current) {
      // Song player queued callback takes priority over jingles
      const transitionCb = songTransitionCallbackRef.current;
      if (transitionCb) {
        songTransitionCallbackRef.current = null;
        transitionCb();
      } else if (jingleReadyRef.current) {
        // Jingle was waiting for this transition — only fire if no YouTube song active
        if (!isSongActiveRef.current) {
          fireReadyJingle(jingleReadyRef.current);
        }
        // If song is active, keep jingleReadyRef pending — will fire when song ends
      } else if (!isSongActiveRef.current) {
        // No jingle pending — count the song and check if threshold is now reached
        // Skip counting ICY changes during YouTube playback (they're not "real" radio songs)
        jingleManagerRef.current?.notifySongChange();
        checkForJingle();
      }
    }
    songTitleRef.current = title;
  };

  const playStation = async (station: RadioStation) => {
    if (currentStation?.id === station.id && isPlayingRef.current) return;

    const gen = ++playGenRef.current;
    const targetVolume = volumeRef.current;

    // Kill any active jingle immediately before switching
    if (jingleAudioRef.current) {
      jingleAudioRef.current.pause();
      jingleAudioRef.current.src = '';
      jingleAudioRef.current = null;
    }

    currentStationIdRef.current = station.id;
    currentStreamUrlRef.current = station.stream_url;
    songTitleRef.current = '';
    jingleReadyRef.current = null;
    jingleReadyAtRef.current = 0;
    icyAvailableRef.current = false;
    if (jinglePreloadRef.current) { jinglePreloadRef.current.src = ''; jinglePreloadRef.current = null; }

    // Reset jingle timer so the countdown restarts from station switch
    jingleManagerRef.current?.resetTimer();

    const currentDeck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    const nextDeck    = activeDeckRef.current === 1 ? audioRef2.current : audioRef1.current;
    if (!currentDeck || !nextDeck) return;

    // Crossfade only when switching from an already-playing station; fresh start = instant volume
    const isCrossfade = !!(currentDeck.src && currentDeck.src !== window.location.href && !currentDeck.paused);

    // Hard-stop nextDeck in case it's mid-crossfade
    nextDeck.pause();
    nextDeck.volume = isCrossfade ? 0 : targetVolume;
    nextDeck.src = station.stream_url;

    // flushSync forces React to synchronously paint the player bar before play() is called.
    // Without this, React batches the state update and the player can appear 1+ seconds late on mobile.
    flushSync(() => {
      setCurrentStation(station);
      setIsPlaying(true);
    });
    isPlayingRef.current = true;

    try {
      await nextDeck.play();

      if (gen !== playGenRef.current) { nextDeck.pause(); return; }

      // Flip active deck after successful play
      activeDeckRef.current = activeDeckRef.current === 1 ? 2 : 1;

      // Fade out old deck (fire-and-forget) or just stop it
      if (isCrossfade) {
        fadeOut(currentDeck, 1500).then(() => { currentDeck.pause(); currentDeck.src = ''; });
      } else {
        currentDeck.pause();
      }

      // Restart jingle check interval (every 60s for interval-based jingles)
      if (jingleCheckIntervalRef.current) clearInterval(jingleCheckIntervalRef.current);
      jingleCheckIntervalRef.current = setInterval(checkForJingle, 60000);

      // Start song title polling (every 30s for songs-based jingles)
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(pollCurrentTitle, 30000);
      pollCurrentTitle(); // Fetch initial title immediately

      if (isCrossfade) await fadeIn(nextDeck, targetVolume, 1500);
      if (!currentDeck.paused) currentDeck.pause();

    } catch (error) {
      // A pause() call while nextDeck.play() is still pending makes the browser
      // reject that play() promise with an AbortError — that's an expected,
      // benign interruption (the user just paused quickly), not a real
      // playback failure, so don't wipe the selected station over it.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      // Rollback UI state if play() genuinely fails (bad stream, network, etc.)
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentStation(null);
      console.error('Greška pri reprodukciji:', error);
    }
  };

  const playJingle = async (jingleUrl: string, volumeBoostDb: number = 0, preloadedAudio?: HTMLAudioElement) => {
    if (!isPlayingRef.current) return;

    const jingleGen = playGenRef.current;
    const radioVolume = volumeRef.current;
    // Radio ducks to 12% of normal — still audible but clearly in the background
    const duckVolume = radioVolume * 0.12;
    // Jingle volume with dB boost, clamped to max 1.0
    const jingleVolume = Math.min(1.0, radioVolume * Math.pow(10, volumeBoostDb / 20));

    const CROSSFADE = 1000; // 1 second crossfades

    const radioDeck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (!radioDeck) return;

    const jingleAudio = preloadedAudio ?? new Audio(jingleUrl);
    jingleAudio.volume = 0;
    jingleAudioRef.current = jingleAudio;

    try {
      // Skip preload wait if already loaded (readyState 4 = HAVE_ENOUGH_DATA)
      if (jingleAudio.readyState < 4) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Jingle load timeout')), 10000);
          jingleAudio.addEventListener('canplaythrough', () => { clearTimeout(timeout); resolve(); }, { once: true });
          jingleAudio.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Jingle load error')); }, { once: true });
          if (!preloadedAudio) jingleAudio.load();
        });
      }

      if (jingleGen !== playGenRef.current || !isPlayingRef.current) {
        jingleAudio.src = ''; jingleAudioRef.current = null; return;
      }

      // Intro crossfade (1s): duck radio down to 12%, fade jingle up — simultaneously
      // Radio keeps playing the whole time (never pauses)
      await jingleAudio.play();
      await Promise.all([
        fadeTo(radioDeck, duckVolume, CROSSFADE),
        fadeIn(jingleAudio, jingleVolume, CROSSFADE),
      ]);

      if (jingleGen !== playGenRef.current || !isPlayingRef.current) {
        jingleAudio.pause(); jingleAudio.src = ''; jingleAudioRef.current = null;
        // Don't restore radio if a YouTube song took over — it handles its own crossfade
        if (!isSongActiveRef.current) fadeTo(radioDeck, radioVolume, 600);
        return;
      }

      // Body: jingle at full, radio quietly in background
      // Wait until CROSSFADE ms before jingle ends to start outro
      const jingleDurationMs = jingleAudio.duration * 1000;
      const bodyWait = Math.max(0, jingleDurationMs - CROSSFADE - CROSSFADE);
      await new Promise<void>((resolve) => setTimeout(resolve, bodyWait));

      if (jingleGen !== playGenRef.current || !isPlayingRef.current) {
        jingleAudio.pause(); jingleAudio.src = ''; jingleAudioRef.current = null;
        if (!isSongActiveRef.current) fadeTo(radioDeck, radioVolume, 600);
        return;
      }

      // Outro crossfade (1s): jingle fades out, radio un-ducks back to full — simultaneously
      await Promise.all([
        fadeOut(jingleAudio, CROSSFADE),
        fadeTo(radioDeck, volumeRef.current, CROSSFADE),
      ]);

      jingleAudio.pause();
      jingleAudio.src = '';
      jingleAudioRef.current = null;

    } catch (error) {
      console.error('❌ Jingle error:', error);
      jingleAudioRef.current = null;
      if (isPlayingRef.current && !isSongActiveRef.current) {
        fadeTo(radioDeck, volumeRef.current, 600);
      }
    }
  };

  const updateJingles = (jingles: UserJingle[]) => {
    if (jingleManagerRef.current) {
      jingleManagerRef.current.updateJingles(jingles);
    }
  };

  const pause = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    playGenRef.current++;

    if (jingleCheckIntervalRef.current) { clearInterval(jingleCheckIntervalRef.current); jingleCheckIntervalRef.current = null; }
    if (songPollIntervalRef.current) { clearInterval(songPollIntervalRef.current); songPollIntervalRef.current = null; }
    songTitleRef.current = '';
    jingleReadyRef.current = null;
    jingleReadyAtRef.current = 0;
    icyAvailableRef.current = false;
    if (jinglePreloadRef.current) { jinglePreloadRef.current.src = ''; jinglePreloadRef.current = null; }

    // Kill active jingle
    if (jingleAudioRef.current) {
      jingleAudioRef.current.pause();
      jingleAudioRef.current.src = '';
      jingleAudioRef.current = null;
    }

    const activeDeck   = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    const inactiveDeck = activeDeckRef.current === 1 ? audioRef2.current : audioRef1.current;

    if (inactiveDeck) { inactiveDeck.pause(); inactiveDeck.volume = 0; }
    if (activeDeck) { fadeOut(activeDeck, 600).then(() => activeDeck.pause()); }

    updateListeningTime();
  };

  const setVolume = (newVolume: number) => {
    const v = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = v;
    setVolumeState(v);
    // Don't restore radio volume while a song is active — radio is at 0 from crossfade.
    // SongPlayerContext's useEffect will update the YouTube player instead.
    if (!isSongActiveRef.current) {
      if (audioRef1.current) audioRef1.current.volume = v;
      if (audioRef2.current) audioRef2.current.volume = v;
    }
  };

  // Fade the active radio deck to any volume — used by SongPlayerContext for crossfade
  const fadeRadioTo = (targetVolume: number, duration: number = 1500) => {
    const deck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (deck) fadeTo(deck, Math.max(0, Math.min(1, targetVolume)), duration);
  };

  // Keep refs current so callbacks and timeupdate handler always call the latest closures
  fireReadyJingleRef.current = fireReadyJingle;
  pollCurrentTitleRef.current = pollCurrentTitle;

  // Called by SongPlayerContext when YouTube song starts or ends
  const setSongActive = (active: boolean) => {
    isSongActiveRef.current = active;
    if (active) {
      // Kill any jingle that's currently playing or preloaded.
      // Increment playGenRef so any in-flight playJingle async fn detects the abort
      // and skips the radio-volume-restore (since isSongActiveRef is now true).
      playGenRef.current++;
      if (jingleAudioRef.current) {
        jingleAudioRef.current.pause();
        jingleAudioRef.current.src = '';
        jingleAudioRef.current = null;
      }
      if (jinglePreloadRef.current) {
        jinglePreloadRef.current.src = '';
        jinglePreloadRef.current = null;
      }
    } else if (isPlayingRef.current && jingleReadyRef.current) {
      // Song ended and a jingle was waiting — fire it after radio crossfade completes
      const jingle = jingleReadyRef.current;
      const gen = playGenRef.current;
      setTimeout(() => {
        if (playGenRef.current === gen && isPlayingRef.current && jingleReadyRef.current === jingle) {
          fireReadyJingleRef.current?.(jingle);
        }
      }, 2800);
    }
  };

  // Register/clear a callback that fires once on the next ICY song transition
  const setSongTransitionCallback = (cb: (() => void) | null) => {
    songTransitionCallbackRef.current = cb;
    if (cb && isPlayingRef.current) {
      // Speed up ICY polling to 3s so we catch song changes quickly
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(pollCurrentTitle, 3000);
      pollCurrentTitle();
    } else if (!cb && isPlayingRef.current) {
      // Restore normal 30s interval
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(pollCurrentTitle, 30000);
    }
  };

  return (
    <AudioContext.Provider
      value={{ currentStation, isPlaying, volume, nowPlayingTitle, nowPlayingCover, playStation, pause, setVolume, playJingle, updateJingles, fadeRadioTo, setSongTransitionCallback, setSongActive }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio mora biti korišćen unutar AudioProvider-a');
  }
  return context;
}
