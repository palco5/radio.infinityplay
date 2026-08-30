import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { RadioStation, UserJingle } from '../types';
import { useAuth } from './AuthContext';
import { profiles as profilesApi, nowplaying as nowplayingApi, blacklist as blacklistApi, BlacklistEntry } from '../lib/api';
import { isTrackBlocked, splitTitle } from '../lib/blacklist';
import { JingleRotationManager } from '../lib/jingleManager';

interface AudioContextType {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  volume: number;
  nowPlayingTitle: string;
  nowPlayingCover: string | null;
  nowPlayingPrevious: { title: string; cover: string | null } | null;
  nowPlayingIsJingle: boolean;
  playStation: (station: RadioStation) => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  playJingle: (url: string, volumeBoostDb?: number) => Promise<void>;
  playCurrentJingle: () => Promise<boolean>;
  updateJingles: (jingles: UserJingle[]) => void;
  fadeRadioTo: (volume: number, duration?: number) => void;
  setSongTransitionCallback: (cb: (() => void) | null) => void;
  setSongActive: (active: boolean) => void;
  // Per-user blacklist (blocked songs / artists)
  blacklist: BlacklistEntry[];
  isNowBlocked: boolean;
  blockCurrentSong: () => Promise<void>;
  blockCurrentArtist: () => Promise<void>;
  blockSongByTitle: (fullTitle: string) => Promise<void>;
  blockArtistByTitle: (fullTitle: string) => Promise<void>;
  skipRadioTrack: () => Promise<{ ok?: boolean } | null>;
  unblock: (id: string) => Promise<void>;
  refreshBlacklist: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [nowPlayingTitle, setNowPlayingTitle] = useState('');
  const [nowPlayingCover, setNowPlayingCover] = useState<string | null>(null);
  const [nowPlayingPrevious, setNowPlayingPrevious] = useState<{ title: string; cover: string | null } | null>(null);
  const [nowPlayingIsJingle, setNowPlayingIsJingle] = useState(false);

  // Per-user blacklist state
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [isNowBlocked, setIsNowBlocked] = useState(false);
  const nowPlayingTitleRef = useRef('');
  const isNowBlockedRef = useRef(false);
  const lastSkipTitleRef = useRef('');
  const lastTitleRef = useRef(''); // last radio title seen, to derive "previous"
  const lastCoverRef = useRef<string | null>(null); // its cover, so "previous" carries artwork too
  // The track the user just blocked while it was playing is allowed to finish;
  // only FUTURE plays of a blocked track are muted (on shared stations).
  const graceTitleRef = useRef('');
  nowPlayingTitleRef.current = nowPlayingTitle;

  // Mirror volume state in a ref so async callbacks always read the live value
  const volumeRef = useRef(0.7);
  // Mirror currentStation in a ref so playStation() can be a stable (useCallback)
  // function without needing currentStation in its dependency array
  const currentStationRef = useRef<RadioStation | null>(null);
  currentStationRef.current = currentStation;

  // Dual-deck system for true crossfade
  const audioRef1 = useRef<HTMLAudioElement | null>(null);
  const audioRef2 = useRef<HTMLAudioElement | null>(null);
  const activeDeckRef = useRef<1 | 2>(1);

  // Short "whoosh" sound played on every station change (a sonic transition)
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);

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

    // Preload the station-change transition sound so it fires instantly
    if (!transitionAudioRef.current) {
      const t = new Audio(`${import.meta.env.BASE_URL}transition.mp3`);
      t.preload = 'auto';
      t.load();
      transitionAudioRef.current = t;
    }

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
      if (transitionAudioRef.current) { transitionAudioRef.current.pause(); transitionAudioRef.current.src = ''; }
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
      setNowPlayingPrevious(null);
      setNowPlayingIsJingle(false);
      lastTitleRef.current = '';
      lastCoverRef.current = null;
      return;
    }

    let cancelled = false;
    const fetchInfo = async () => {
      const info = await nowplayingApi.getInfo(currentStation.stream_url);
      if (cancelled) return;
      // "Previous track" isn't available from the stream/MediaCP (the :2020 API
      // isn't reachable from the backend, and next/upcoming doesn't exist), so
      // derive it here: when the current title changes, the one that just ended
      // becomes the previous. Uses the already-cleaned title, so it's tidy.
      // A jingle (station ID/promo the AutoDJ drops in) is shown by name with a
      // mic icon, and is deliberately kept OUT of the track history: when one
      // plays we reveal the song that ran *before* it as "previous", but never
      // record the jingle itself, so it never appears as the previous track.
      const isJingle = info.isJingle === true;
      if (info.title && info.title !== lastTitleRef.current) {
        if (lastTitleRef.current) setNowPlayingPrevious({ title: lastTitleRef.current, cover: lastCoverRef.current });
        if (!isJingle) {
          lastTitleRef.current = info.title;
          lastCoverRef.current = info.coverart;
        }
      }
      setNowPlayingTitle(info.title);
      setNowPlayingCover(isJingle ? null : info.coverart);
      setNowPlayingIsJingle(isJingle);
    };

    // Poll faster when the user has a blacklist so a blocked track is caught
    // (and muted) sooner — a shared live stream can only be filtered locally.
    const pollMs = blacklist.length > 0 ? 7000 : 15000;
    fetchInfo();
    const id = setInterval(fetchInfo, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [isPlaying, currentStation, blacklist.length]);

  // Reset the derived "previous track" when switching stations so it never
  // carries the old station's last song over to the new one.
  useEffect(() => {
    lastTitleRef.current = '';
    lastCoverRef.current = null;
    setNowPlayingPrevious(null);
    setNowPlayingIsJingle(false);
  }, [currentStation?.id]);

  // Load this user's blacklist on sign-in.
  const refreshBlacklist = useCallback(async () => {
    if (!userIdRef.current) { setBlacklist([]); return; }
    try {
      setBlacklist(await blacklistApi.getAll());
    } catch (e) {
      console.error('Failed to load blacklist:', e);
    }
  }, []);

  useEffect(() => {
    if (user) refreshBlacklist();
    else setBlacklist([]);
  }, [user, refreshBlacklist]);

  // Enforce the blacklist locally for THIS user:
  //  - Personal "Moj Radio" station → a skip IS per-user, so really advance the
  //    AutoDJ via MediaCP skip-track (mute briefly to cover the transition).
  //  - Shared genre station → we can't skip the shared stream, so the track the
  //    user is currently hearing is left to finish (it's just added to the
  //    blacklist); FUTURE plays of any blocked track are muted for this user.
  useEffect(() => {
    const station = currentStation;
    const isMoj = !!station && station.id.startsWith('moj-radio-');
    const blocked =
      isPlaying && !!station && !isSongActiveRef.current &&
      isTrackBlocked(nowPlayingTitle, blacklist);
    // Don't mute the exact track that was playing when the user blocked it —
    // let it finish; only future occurrences are muted.
    const inGrace = blocked && nowPlayingTitle === graceTitleRef.current;

    if (blocked && isMoj) {
      // Na Moj Radio: SAMO seamless skip, nikad utišavanje. Pesma se čuje dok ne
      // dođe nova (bez tišine), a obrisana je iz MediaCP-a pa se ne ponavlja.
      // Bez muta je dosledno bez obzira odakle je blok stigao (uređaj/daljinski/
      // telefon) — daljinski nema lokalni "grace" pa bi inače utišao.
      if (lastSkipTitleRef.current !== nowPlayingTitle) {
        lastSkipTitleRef.current = nowPlayingTitle;
        blacklistApi.skipMojRadio(station!.stream_url).catch(() => {});
      }
    } else if (blocked && !isMoj && !inGrace) {
      if (!isNowBlockedRef.current) {
        isNowBlockedRef.current = true;
        setIsNowBlocked(true);
        fadeRadioTo(0, 500);
      }
    } else if (isNowBlockedRef.current) {
      isNowBlockedRef.current = false;
      setIsNowBlocked(false);
      lastSkipTitleRef.current = '';
      if (isPlaying && !isSongActiveRef.current) fadeRadioTo(volumeRef.current, 800);
    }

    // Once the graced track is no longer what's playing, drop the grace so it
    // gets muted if it ever comes around again.
    if (graceTitleRef.current && nowPlayingTitle !== graceTitleRef.current) {
      graceTitleRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlayingTitle, blacklist, isPlaying, currentStation]);

  // Block a song from an explicit "Artist - Title" string (used by the mobile
  // remote control, which blocks what's playing on the selected local device).
  const blockSongByTitle = useCallback(async (fullTitle: string) => {
    const { artist, title } = splitTitle(fullTitle);
    if (!title) return;
    graceTitleRef.current = fullTitle; // let this exact track finish if it's playing here
    try {
      const entry = await blacklistApi.blockSong(artist, title);
      if (entry) setBlacklist(prev => [entry, ...prev]);
    } catch (e) {
      console.error('Failed to block song:', e);
    }
  }, []);

  const blockArtistByTitle = useCallback(async (fullTitle: string) => {
    const { artist } = splitTitle(fullTitle);
    if (!artist) return;
    graceTitleRef.current = fullTitle;
    try {
      const entry = await blacklistApi.blockArtist(artist);
      if (entry) setBlacklist(prev => [entry, ...prev]);
    } catch (e) {
      console.error('Failed to block artist:', e);
    }
  }, []);

  // Block the song / artist currently playing on the radio (local now-playing).
  const blockCurrentSong = useCallback(() => blockSongByTitle(nowPlayingTitleRef.current), [blockSongByTitle]);
  const blockCurrentArtist = useCallback(() => blockArtistByTitle(nowPlayingTitleRef.current), [blockArtistByTitle]);

  // Manually skip the current track on the user's personal Moj Radio (MediaCP).
  // No-op on shared stations — a shared stream can't be skipped per-listener.
  // We DON'T reconnect the audio afterwards: a reconnect (pause + fresh connect
  // at the live edge) causes a brief silence. Instead the stream keeps playing
  // continuously — MediaCP cuts the current track in the broadcast, so the new
  // song arrives naturally through the ongoing stream, with no gap of silence
  // (the skip is simply heard once the already-buffered audio drains).
  const skipRadioTrack = useCallback(async (): Promise<{ ok?: boolean } | null> => {
    const st = currentStationRef.current;
    if (!st || !st.id.startsWith('moj-radio-')) return null;
    return await blacklistApi.skipMojRadio(st.stream_url).catch(() => null);
  }, []);

  const unblock = useCallback(async (id: string) => {
    try {
      await blacklistApi.remove(id);
      setBlacklist(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Failed to unblock:', e);
    }
  }, []);

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

  // Plays the transition "whoosh" over whatever is happening. Uses its own audio
  // element so it overlays the crossfade and is never ducked. Respects mute.
  const playTransitionSound = useCallback(() => {
    const vol = volumeRef.current;
    if (vol <= 0) return; // muted — stay silent
    const el = transitionAudioRef.current;
    if (!el) return;
    try {
      el.volume = Math.min(1, vol);
      el.currentTime = 0;
      el.play().catch(() => { /* autoplay blocked or interrupted — ignore */ });
    } catch { /* ignore */ }
  }, []);

  const playStation = useCallback(async (station: RadioStation) => {
    if (currentStationRef.current?.id === station.id && isPlayingRef.current) return;

    // Sonic transition on every station change / start, no matter how it was triggered
    playTransitionSound();

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
      songPollIntervalRef.current = setInterval(() => pollCurrentTitleRef.current(), 30000);
      pollCurrentTitleRef.current(); // Fetch initial title immediately

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
  }, []);

  const playJingle = useCallback(async (jingleUrl: string, volumeBoostDb: number = 0, preloadedAudio?: HTMLAudioElement) => {
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
  }, []);

  const jinglesRef = useRef<UserJingle[]>([]);

  const updateJingles = useCallback((jingles: UserJingle[]) => {
    jinglesRef.current = jingles;
    if (jingleManagerRef.current) {
      jingleManagerRef.current.updateJingles(jingles);
    }
  }, []);

  // Ručno pusti korisnikov džingl (dugme "Pusti džingl") preko trenutne radio
  // stanice — radi i za Moj Radio i za tematske stanice (lokalni overlay: priguši
  // radio, pusti džingl, vrati). Vraća false ako korisnik nema aktivan džingl.
  const playCurrentJingle = useCallback(async (): Promise<boolean> => {
    const list = jinglesRef.current;
    const active = list.filter(j => j.is_active !== false);
    const jingle = (active.length ? active : list)
      .slice()
      .sort((a, b) => (a.play_order || 0) - (b.play_order || 0))[0];
    if (!jingle) return false;
    const url = jingle.jingle_data
      ? `data:audio/mpeg;base64,${jingle.jingle_data}`
      : jingle.cloudinary_url || '';
    if (!url) return false;
    await playJingle(url, jingle.volume_boost_db || 0);
    return true;
  }, [playJingle]);

  const pause = useCallback(() => {
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
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const v = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = v;
    setVolumeState(v);
    // Don't restore radio volume while a song is active — radio is at 0 from crossfade.
    // SongPlayerContext's useEffect will update the YouTube player instead.
    if (!isSongActiveRef.current) {
      if (audioRef1.current) audioRef1.current.volume = v;
      if (audioRef2.current) audioRef2.current.volume = v;
    }
  }, []);

  // Fade the active radio deck to any volume — used by SongPlayerContext for crossfade
  const fadeRadioTo = useCallback((targetVolume: number, duration: number = 1500) => {
    const deck = activeDeckRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (deck) fadeTo(deck, Math.max(0, Math.min(1, targetVolume)), duration);
  }, []);

  // Keep refs current so callbacks and timeupdate handler always call the latest closures
  fireReadyJingleRef.current = fireReadyJingle;
  pollCurrentTitleRef.current = pollCurrentTitle;

  // Called by SongPlayerContext when YouTube song starts or ends
  const setSongActive = useCallback((active: boolean) => {
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
  }, []);

  // Register/clear a callback that fires once on the next ICY song transition
  const setSongTransitionCallback = useCallback((cb: (() => void) | null) => {
    songTransitionCallbackRef.current = cb;
    if (cb && isPlayingRef.current) {
      // Speed up ICY polling to 3s so we catch song changes quickly
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(() => pollCurrentTitleRef.current(), 3000);
      pollCurrentTitleRef.current();
    } else if (!cb && isPlayingRef.current) {
      // Restore normal 30s interval
      if (songPollIntervalRef.current) clearInterval(songPollIntervalRef.current);
      songPollIntervalRef.current = setInterval(() => pollCurrentTitleRef.current(), 30000);
    }
  }, []);

  return (
    <AudioContext.Provider
      value={{ currentStation, isPlaying, volume, nowPlayingTitle, nowPlayingCover, nowPlayingPrevious, nowPlayingIsJingle, playStation, pause, setVolume, playJingle, playCurrentJingle, updateJingles, fadeRadioTo, setSongTransitionCallback, setSongActive, blacklist, isNowBlocked, blockCurrentSong, blockCurrentArtist, blockSongByTitle, blockArtistByTitle, skipRadioTrack, unblock, refreshBlacklist }}
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
