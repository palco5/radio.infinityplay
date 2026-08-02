import { useEffect, useRef, useCallback } from 'react';
import { remote } from '../lib/api';
import { RadioStation } from '../types';
import { SongInfo, SongState } from '../contexts/SongPlayerContext';

export interface RemoteDevice {
  device_id: string;
  device_type: string;
  device_name: string;
  device_number: number;
  station_id: string | null;
  station_name: string | null;
  is_playing: boolean;
  song_title: string | null;
  song_artist: string | null;
  song_artwork: string | null;
  now_playing_title: string | null;
  now_playing_cover: string | null;
  now_playing_is_jingle?: boolean;
  song_state: SongState;
  song_queue: SongInfo[] | null;
  saved_playlist_count: number;
  volume: number; // 0-100
  last_seen: string;
}

function getDeviceId(): string {
  let id = localStorage.getItem('remote_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('remote_device_id', id);
  }
  return id;
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const w = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!hasTouch || w >= 1024) return 'desktop';
  if (w >= 768) return 'tablet';
  return 'mobile';
}

function getDefaultDeviceName(type: string): string {
  if (type === 'tablet') return 'Tablet';
  if (type !== 'desktop') return 'Telefon';
  return 'Računar';
}

interface UseRemoteSessionOptions {
  enabled: boolean;
  currentStation: RadioStation | null;
  isPlaying: boolean;
  nowPlayingTitle: string;
  nowPlayingCover: string | null;
  nowPlayingIsJingle: boolean;
  songState: SongState;
  currentSong: SongInfo | null;
  songQueue: SongInfo[];
  postRadioQueue: SongInfo[];
  savedPlaylistCount: number;
  volume: number; // 0..1
  onSetVolume?: (volume: number) => void;
  onPlayStation: (station: RadioStation, allStations: RadioStation[]) => void;
  onPause: () => void;
  onResume: () => void;
  onSongPause: () => void;
  onSongResume: () => void;
  onSongStop: () => void;
  onSongSkip?: () => void;
  onSongPlay?: (song: SongInfo, immediate: boolean) => void;
  onScheduleSwitch?: (keepInQueue: number, station: RadioStation) => void;
  onResumeSaved?: (immediate: boolean) => void;
  allStations: RadioStation[];
  onSessionsChange: (sessions: RemoteDevice[], myDeviceId: string) => void;
}

export function useRemoteSession({
  enabled,
  currentStation,
  isPlaying,
  nowPlayingTitle,
  nowPlayingCover,
  nowPlayingIsJingle,
  songState,
  currentSong,
  songQueue,
  postRadioQueue,
  savedPlaylistCount,
  volume,
  onSetVolume,
  onPlayStation,
  onPause,
  onResume,
  onSongPause,
  onSongResume,
  onSongStop,
  onSongSkip,
  onSongPlay,
  onScheduleSwitch,
  onResumeSaved,
  allStations,
  onSessionsChange,
}: UseRemoteSessionOptions) {
  const deviceId = useRef(getDeviceId());
  const deviceType = useRef(getDeviceType());
  const deviceName = useRef(
    localStorage.getItem('remote_device_name') || getDefaultDeviceName(deviceType.current)
  );
  const lastCommandId = useRef<string | null>(null);
  const deviceNumberInitialized = useRef(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionsRef = useRef<RemoteDevice[]>([]);

  const enabledRef = useRef(enabled);
  const savedPlaylistCountRef = useRef(savedPlaylistCount);
  const currentStationRef = useRef(currentStation);
  const isPlayingRef = useRef(isPlaying);
  const nowPlayingTitleRef = useRef(nowPlayingTitle);
  const nowPlayingCoverRef = useRef(nowPlayingCover);
  const nowPlayingIsJingleRef = useRef(nowPlayingIsJingle);
  const songStateRef = useRef(songState);
  const currentSongRef = useRef(currentSong);
  const songQueueRef = useRef(songQueue);
  const postRadioQueueRef = useRef(postRadioQueue);
  const volumeRef = useRef(volume);
  const onSetVolumeRef = useRef(onSetVolume);
  const allStationsRef = useRef(allStations);
  const onPlayStationRef = useRef(onPlayStation);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onSongPauseRef = useRef(onSongPause);
  const onSongResumeRef = useRef(onSongResume);
  const onSongStopRef = useRef(onSongStop);
  const onSongSkipRef = useRef(onSongSkip);
  const onSongPlayRef = useRef(onSongPlay);
  const onScheduleSwitchRef = useRef(onScheduleSwitch);
  const onResumeSavedRef = useRef(onResumeSaved);
  const onSessionsChangeRef = useRef(onSessionsChange);

  enabledRef.current = enabled;
  savedPlaylistCountRef.current = savedPlaylistCount;
  currentStationRef.current = currentStation;
  isPlayingRef.current = isPlaying;
  nowPlayingTitleRef.current = nowPlayingTitle;
  nowPlayingCoverRef.current = nowPlayingCover;
  nowPlayingIsJingleRef.current = nowPlayingIsJingle;
  songStateRef.current = songState;
  currentSongRef.current = currentSong;
  songQueueRef.current = songQueue;
  postRadioQueueRef.current = postRadioQueue;
  volumeRef.current = volume;
  onSetVolumeRef.current = onSetVolume;
  allStationsRef.current = allStations;
  onPlayStationRef.current = onPlayStation;
  onPauseRef.current = onPause;
  onResumeRef.current = onResume;
  onSongPauseRef.current = onSongPause;
  onSongResumeRef.current = onSongResume;
  onSongStopRef.current = onSongStop;
  onSongSkipRef.current = onSongSkip;
  onSongPlayRef.current = onSongPlay;
  onScheduleSwitchRef.current = onScheduleSwitch;
  onResumeSavedRef.current = onResumeSaved;
  onSessionsChangeRef.current = onSessionsChange;

  const executeCommand = useCallback((command: string) => {
    if (command === 'pause') {
      onPauseRef.current();
    } else if (command === 'resume') {
      onResumeRef.current();
    } else if (command === 'song_pause') {
      onSongPauseRef.current();
    } else if (command === 'song_resume') {
      onSongResumeRef.current();
    } else if (command === 'song_stop') {
      onSongStopRef.current();
    } else if (command === 'song_skip') {
      onSongSkipRef.current?.();
    } else if (command.startsWith('play:')) {
      const stationId = command.slice(5);
      const station = allStationsRef.current.find(s => s.id === stationId);
      if (station) onPlayStationRef.current(station, allStationsRef.current);
    } else if (command.startsWith('song_play:')) {
      try {
        const data = JSON.parse(decodeURIComponent(command.slice(10)));
        const { immediate, ...song } = data;
        onSongPlayRef.current?.(song as SongInfo, immediate !== false);
      } catch { /* invalid payload, ignore */ }
    } else if (command.startsWith('switch_after_songs:')) {
      // switch_after_songs:N:stationId  — keep N songs in queue, then switch
      const rest = command.slice(19);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        const n = parseInt(rest.slice(0, colonIdx), 10);
        const stationId = rest.slice(colonIdx + 1);
        const station = allStationsRef.current.find(s => s.id === stationId);
        if (station && !isNaN(n)) onScheduleSwitchRef.current?.(n, station);
      }
    } else if (command.startsWith('switch_after_song:')) {
      const stationId = command.slice(18);
      const station = allStationsRef.current.find(s => s.id === stationId);
      if (station) onScheduleSwitchRef.current?.(0, station);
    } else if (command.startsWith('volume:')) {
      const v = parseInt(command.slice(7), 10);
      if (!isNaN(v)) onSetVolumeRef.current?.(Math.max(0, Math.min(100, v)) / 100);
    } else if (command === 'resume_saved_now') {
      onResumeSavedRef.current?.(true);
    } else if (command === 'resume_saved_after') {
      onResumeSavedRef.current?.(false);
    } else if (command.startsWith('rename:')) {
      const newName = command.slice(7).trim();
      if (newName) {
        localStorage.setItem('remote_device_name', newName);
        deviceName.current = newName;
      }
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const song = currentSongRef.current;
      const queueItems = [...songQueueRef.current, ...postRadioQueueRef.current];
      const res = await remote.heartbeat({
        device_id: deviceId.current,
        device_type: deviceType.current,
        device_name: deviceName.current,
        station_id: currentStationRef.current?.id ?? null,
        station_name: currentStationRef.current?.name ?? null,
        is_playing: isPlayingRef.current,
        song_title: song?.title ?? null,
        song_artist: song?.artist ?? null,
        song_artwork: song?.artwork ?? null,
        now_playing_title: nowPlayingTitleRef.current || null,
        now_playing_cover: nowPlayingCoverRef.current || null,
        now_playing_is_jingle: nowPlayingIsJingleRef.current,
        song_state: songStateRef.current,
        song_queue: queueItems.length > 0 ? JSON.stringify(queueItems) : null,
        saved_playlist_count: savedPlaylistCountRef.current,
        volume: Math.round(volumeRef.current * 100),
      });

      if (deviceType.current === 'desktop' && !deviceNumberInitialized.current) {
        deviceNumberInitialized.current = true;
        const storedName = localStorage.getItem('remote_device_name');
        const serverName: string = res.server_name || '';
        const isDefaultServerName = !serverName || serverName === 'Računar' || serverName === 'Uređaj';

        if (!storedName) {
          if (!isDefaultServerName) {
            deviceName.current = serverName;
            localStorage.setItem('remote_device_name', serverName);
          } else if (res.device_number > 0) {
            const defaultName = `Lokal ${res.device_number}`;
            deviceName.current = defaultName;
            localStorage.setItem('remote_device_name', defaultName);
          }
        }
      }

      if (res.pending_command && res.command_id !== lastCommandId.current) {
        lastCommandId.current = res.command_id;
        executeCommand(res.pending_command);
        await remote.ack(deviceId.current, res.command_id);
        // Chain immediately to drain the next command from the queue
        setTimeout(() => sendHeartbeat(), 80);
      }
    } catch { /* network issue, ignore */ }
  }, [executeCommand]);

  const pollSessions = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const res = await remote.status(deviceId.current);
      const sessions: RemoteDevice[] = (res.sessions || [])
        .filter((s: any) => s.device_id !== deviceId.current)
        .map((s: any): RemoteDevice => {
          let parsedQueue: SongInfo[] | null = null;
          if (s.song_queue) {
            try { parsedQueue = JSON.parse(s.song_queue); } catch {}
          }
          return { ...s, is_playing: !!s.is_playing, now_playing_is_jingle: s.now_playing_is_jingle === true || s.now_playing_is_jingle === 1 || s.now_playing_is_jingle === '1', song_queue: parsedQueue, saved_playlist_count: parseInt(String(s.saved_playlist_count ?? 0), 10), volume: parseInt(String(s.volume ?? 70), 10) };
        });

      if (JSON.stringify(sessions) !== JSON.stringify(sessionsRef.current)) {
        sessionsRef.current = sessions;
        onSessionsChangeRef.current(sessions, deviceId.current);
      }
    } catch { /* ignore */ }
  }, []);

  const sendCommand = useCallback(async (targetDeviceId: string, command: string) => {
    if (!enabledRef.current) return;
    try {
      await remote.sendCommand(targetDeviceId, command);
      if (command.startsWith('rename:')) {
        const newName = command.slice(7).trim();
        if (newName) await remote.renameDevice(targetDeviceId, newName);
      }
    } catch { /* ignore */ }
  }, []);

  // Immediately push state changes to server — don't wait for the 2s interval.
  // Browsers throttle setInterval in background tabs, so without this the phone
  // would see stale is_playing / song_state until the next unthrottled tick.
  useEffect(() => {
    if (!enabledRef.current) return;
    sendHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentStation?.id, songState]);

  useEffect(() => {
    if (!enabled) return;

    sendHeartbeat();
    pollSessions();

    heartbeatTimer.current = setInterval(sendHeartbeat, 2000);
    pollTimer.current = setInterval(pollSessions, 2000);

    // When page comes back to foreground, immediately poll (timers throttle in background)
    const handleBecomeVisible = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
        pollSessions();
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        if (pollTimer.current) clearInterval(pollTimer.current);
        heartbeatTimer.current = setInterval(sendHeartbeat, 2000);
        pollTimer.current = setInterval(pollSessions, 2000);
      }
    };
    const handleFocus = () => { sendHeartbeat(); pollSessions(); };

    document.addEventListener('visibilitychange', handleBecomeVisible);
    window.addEventListener('focus', handleFocus);

    const handleUnload = () => remote.unregister(deviceId.current);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      document.removeEventListener('visibilitychange', handleBecomeVisible);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleUnload);
      remote.unregister(deviceId.current);
    };
  }, [enabled, sendHeartbeat, pollSessions]);

  return {
    deviceId: deviceId.current,
    deviceType: deviceType.current,
    sendCommand,
  };
}
