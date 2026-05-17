import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { RadioStation, UserJingle } from '../types';
import { useAuth } from './AuthContext';
import { profiles as profilesApi, nowplaying as nowplayingApi } from '../lib/api';
import { JingleRotationManager } from '../lib/jingleManager';

interface AudioContextType {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  volume: number;
  playStation: (station: RadioStation) => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  playJingle: (url: string, volumeBoostDb?: number) => Promise<void>;
  updateJingles: (jingles: UserJingle[]) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

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

    return () => {
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
        (Date.now() - jingleReadyAtRef.current) > 180_000) {
      fireReadyJingle(jingleReadyRef.current);
      return;
    }

    const title = await nowplayingApi.getTitle(currentStreamUrlRef.current);
    if (title) icyAvailableRef.current = true;
    if (!title) return;

    if (songTitleRef.current && title !== songTitleRef.current) {
      if (jingleReadyRef.current) {
        // Jingle was waiting for exactly this transition — fire it now
        fireReadyJingle(jingleReadyRef.current);
      } else {
        // No jingle pending — count the song and check if threshold is now reached
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

    // Hard-stop nextDeck in case it's mid-crossfade
    nextDeck.pause();
    nextDeck.volume = 0;
    nextDeck.src = station.stream_url;

    try {
      await nextDeck.play();

      if (gen !== playGenRef.current) { nextDeck.pause(); return; }

      setCurrentStation(station);
      setIsPlaying(true);
      isPlayingRef.current = true;

      // Flip active deck IMMEDIATELY so subsequent calls read the correct deck
      activeDeckRef.current = activeDeckRef.current === 1 ? 2 : 1;

      // Fade out old deck (fire-and-forget)
      if (currentDeck.src && currentDeck.src !== window.location.href && !currentDeck.paused) {
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

      await fadeIn(nextDeck, targetVolume, 1500);
      if (!currentDeck.paused) currentDeck.pause();

    } catch (error) {
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
        fadeTo(radioDeck, radioVolume, 600);
        return;
      }

      // Body: jingle at full, radio quietly in background
      // Wait until CROSSFADE ms before jingle ends to start outro
      const jingleDurationMs = jingleAudio.duration * 1000;
      const bodyWait = Math.max(0, jingleDurationMs - CROSSFADE - CROSSFADE);
      await new Promise<void>((resolve) => setTimeout(resolve, bodyWait));

      if (jingleGen !== playGenRef.current || !isPlayingRef.current) {
        jingleAudio.pause(); jingleAudio.src = ''; jingleAudioRef.current = null;
        fadeTo(radioDeck, radioVolume, 600);
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
      // Restore radio volume on failure
      if (isPlayingRef.current) {
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
    if (audioRef1.current) audioRef1.current.volume = v;
    if (audioRef2.current) audioRef2.current.volume = v;
  };

  return (
    <AudioContext.Provider
      value={{ currentStation, isPlaying, volume, playStation, pause, setVolume, playJingle, updateJingles }}
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
