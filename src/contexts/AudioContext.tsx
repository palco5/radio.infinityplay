import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { RadioStation, UserJingle } from '../types';
import { useAuth } from './AuthContext';
import { profiles as profilesApi } from '../lib/api';
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

  const checkForJingle = () => {
    if (!isPlayingRef.current || !jingleManagerRef.current) return;
    // Never play jingles on Moj Radio — user manages those in MediaCP
    if (currentStationIdRef.current?.startsWith('moj-radio-')) return;

    const jingle = jingleManagerRef.current.shouldPlayJingle();
    if (!jingle) return;

    const url = jingle.jingle_data
      ? `data:audio/mpeg;base64,${jingle.jingle_data}`
      : jingle.cloudinary_url || '';

    playJingle(url, jingle.volume_boost_db || 0)
      .then(() => { jingleManagerRef.current?.markPlayed(jingle.id); })
      .catch((err) => console.error('❌ Jingle playback failed:', err));
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

      // Restart jingle check interval (every 60s)
      if (jingleCheckIntervalRef.current) clearInterval(jingleCheckIntervalRef.current);
      jingleCheckIntervalRef.current = setInterval(checkForJingle, 60000);

      await fadeIn(nextDeck, targetVolume, 1500);
      if (!currentDeck.paused) currentDeck.pause();

    } catch (error) {
      console.error('Greška pri reprodukciji:', error);
    }
  };

  const playJingle = async (jingleUrl: string, volumeBoostDb: number = 0) => {
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

    const jingleAudio = new Audio(jingleUrl);
    jingleAudio.volume = 0;
    jingleAudioRef.current = jingleAudio;

    try {
      // Preload fully before starting
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Jingle load timeout')), 10000);
        jingleAudio.addEventListener('canplaythrough', () => { clearTimeout(timeout); resolve(); }, { once: true });
        jingleAudio.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Jingle load error')); }, { once: true });
        jingleAudio.load();
      });

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
