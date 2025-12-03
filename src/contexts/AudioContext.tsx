import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { RadioStation } from '../types';
import { localAuth } from '../lib/localStorage';

interface AudioContextType {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  volume: number;
  playStation: (station: RadioStation) => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  playJingle: (url: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

  // Dual-deck system for true crossfade
  const audioRef1 = useRef<HTMLAudioElement | null>(null);
  const audioRef2 = useRef<HTMLAudioElement | null>(null);
  const activeDeckRef = useRef<1 | 2>(1); // Koji deck trenutno svira stanicu

  const userIdRef = useRef<string | null>(null);
  const listeningStartTime = useRef<number | null>(null);

  // Inicijalizacija audio elemenata
  useEffect(() => {
    if (!audioRef1.current) audioRef1.current = new Audio();
    if (!audioRef2.current) audioRef2.current = new Audio();

    // Postavi volume
    audioRef1.current.volume = volume;
    audioRef2.current.volume = volume;

    // Učitaj trenutnog korisnika
    const currentUser = localAuth.getCurrentUser();
    if (currentUser) {
      userIdRef.current = currentUser.id;
    }

    return () => {
      if (audioRef1.current) {
        audioRef1.current.pause();
        audioRef1.current.src = '';
      }
      if (audioRef2.current) {
        audioRef2.current.pause();
        audioRef2.current.src = '';
      }
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

  const updateListeningTime = () => {
    if (listeningStartTime.current && userIdRef.current) {
      const minutesListened = Math.floor((Date.now() - listeningStartTime.current) / 60000);
      if (minutesListened > 0) {
        const profile = localAuth.getProfile(userIdRef.current);
        if (profile) {
          const newTotal = (profile.total_listening_minutes || 0) + minutesListened;
          localAuth.updateProfile(userIdRef.current, {
            total_listening_minutes: newTotal,
          });
        }
      }
      listeningStartTime.current = null;
    }
  };

  const fadeOut = (audio: HTMLAudioElement, duration: number = 1500): Promise<void> => {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const curve = Math.pow(1 - progress, 2); // Kvadratna kriva
        audio.volume = Math.max(0, startVolume * curve);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.volume = 0;
          resolve();
        }
      }, stepDuration);
    });
  };

  const fadeIn = (audio: HTMLAudioElement, targetVolume: number, duration: number = 1500): Promise<void> => {
    return new Promise((resolve) => {
      audio.volume = 0;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const curve = Math.pow(progress, 2); // Kvadratna kriva
        audio.volume = Math.min(targetVolume, targetVolume * curve);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  };

  const playStation = async (station: RadioStation) => {
    if (currentStation?.id === station.id && isPlaying) return;

    const targetVolume = volume;
    const currentDeck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    const nextDeck = activeDeckRef.current === 1 ? audioRef2.current : audioRef1.current;

    if (!currentDeck || !nextDeck) return;

    // 1. Pripremi novi deck
    nextDeck.src = station.stream_url;
    nextDeck.volume = 0;
    nextDeck.load();

    try {
      // 2. Pusti novi deck (mute-ovan)
      await nextDeck.play();

      // 3. Crossfade: Fade Out stari + Fade In novi ISTOVREMENO
      if (isPlaying && currentDeck.src) {
        // Ne čekamo da se završi fadeOut, puštamo ih paralelno
        fadeOut(currentDeck, 1500).then(() => {
          currentDeck.pause(); // Tek kad se skroz stiša, pauziraj
        });
      }

      setCurrentStation(station);
      setIsPlaying(true);

      // Fade In novi
      await fadeIn(nextDeck, targetVolume, 1500);

      // Zameni aktivni deck
      activeDeckRef.current = activeDeckRef.current === 1 ? 2 : 1;

    } catch (error) {
      console.error('Greška pri reprodukciji:', error);
    }
  };

  // Nova funkcija za džinglove koja je dostupna kroz context
  const playJingle = async (jingleUrl: string) => {
    const currentDeck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (!currentDeck || !isPlaying) return;

    // Kreiraj privremeni audio za džingl
    const jingleAudio = new Audio(jingleUrl);
    jingleAudio.volume = 0;

    try {
      await jingleAudio.play();

      // CROSSFADE START: Fade Out stanica + Fade In džingl (1.5s)
      const targetVol = volume;

      // Paralelno: Stišaj stanicu (ali NE pauziraj) i pojačaj džingl
      Promise.all([
        fadeOut(currentDeck, 1500), // Stišaj stanicu na 0
        fadeIn(jingleAudio, targetVol, 1500) // Pojačaj džingl
      ]);

      // Čekaj da se džingl završi (minus 1.5s za crossfade na kraju)
      const jingleDuration = jingleAudio.duration * 1000;
      const crossfadeTime = 1500;

      // Tajmer za kraj džingla
      setTimeout(async () => {
        // CROSSFADE END: Fade Out džingl + Fade In stanica
        await Promise.all([
          fadeOut(jingleAudio, crossfadeTime),
          fadeIn(currentDeck, targetVol, crossfadeTime)
        ]);

        // Očisti džingl
        jingleAudio.pause();
        jingleAudio.src = '';
      }, Math.max(0, jingleDuration - crossfadeTime));

    } catch (err) {
      console.error('Greška pri puštanju džingla:', err);
      // Ako džingl pukne, vrati stanicu
      currentDeck.volume = volume;
    }
  };

  const pause = () => {
    const currentDeck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (currentDeck) {
      fadeOut(currentDeck, 500).then(() => {
        currentDeck.pause();
        setIsPlaying(false);
      });
    }
    updateListeningTime();
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    // Ažuriraj volume na oba deck-a ako sviraju
    if (audioRef1.current) audioRef1.current.volume = clampedVolume;
    if (audioRef2.current) audioRef2.current.volume = clampedVolume;
  };

  return (
    <AudioContext.Provider
      value={{
        currentStation,
        isPlaying,
        volume,
        playStation,
        pause,
        setVolume,
        playJingle, // Dodajemo u context
      }}
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
