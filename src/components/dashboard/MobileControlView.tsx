import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronLeft, MapPin, ChevronDown, Radio as RadioIcon, Play, Pause, SkipForward,
  Square, Music, Wifi, WifiOff, Search, X, Clock, Check, Headphones, Pencil,
  Volume2, VolumeX, Ban, Mic2,
} from 'lucide-react';
import { RadioStation } from '../../types';
import { RemoteDevice } from '../../hooks/useRemoteSession';
import { useAudio } from '../../contexts/AudioContext';
import { blacklist as blacklistApi } from '../../lib/api';
import VolumeSlider from '../player/VolumeSlider';
import DJManagerOverlay from './DJManagerOverlay';
import BlacklistModal from './BlacklistModal';
import StationCard from '../StationCard';
import MojRadioCard from '../MojRadioCard';

interface MobileControlViewProps {
  onBack: () => void;
  stations: RadioStation[];
  remoteSessions: RemoteDevice[];
  sendRemoteCommand: (targetDeviceId: string, command: string) => void;
}

interface Optimistic {
  stationId?: string;
  stationName?: string;
  isPaused?: boolean;
}

const isSongActive = (s: RemoteDevice | null) =>
  !!s && (s.song_state === 'playing' || s.song_state === 'paused' || s.song_state === 'loading');

export default function MobileControlView({ onBack, stations, remoteSessions, sendRemoteCommand }: MobileControlViewProps) {
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [showLocalPicker, setShowLocalPicker] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const [isDJOpen, setIsDJOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);
  const [switchPending, setSwitchPending] = useState<{ station: RadioStation; queueCount: number } | null>(null);
  const djButtonRef = useRef<HTMLButtonElement>(null);

  // Rename-local state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamedNames, setRenamedNames] = useState<Record<string, string>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Blacklist — block what's playing on the controlled local, view/manage list
  const { blockSongByTitle, blockArtistByTitle } = useAudio();
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const blockMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashBlock = (m: string) => {
    setBlockMsg(m);
    if (blockMsgTimer.current) clearTimeout(blockMsgTimer.current);
    blockMsgTimer.current = setTimeout(() => setBlockMsg(null), 2200);
  };
  useEffect(() => () => { if (blockMsgTimer.current) clearTimeout(blockMsgTimer.current); }, []);

  // Auto-select when there is exactly one local, and keep selection valid.
  useEffect(() => {
    if (selectedLocalId && !remoteSessions.find(s => s.device_id === selectedLocalId)) {
      setSelectedLocalId(null);
    } else if (!selectedLocalId && remoteSessions.length === 1) {
      setSelectedLocalId(remoteSessions[0].device_id);
    }
  }, [remoteSessions, selectedLocalId]);

  const selectedDevice = useMemo(
    () => remoteSessions.find(s => s.device_id === selectedLocalId) ?? null,
    [remoteSessions, selectedLocalId],
  );

  // Clear optimistic state once the server confirms it.
  useEffect(() => {
    if (!optimistic || !selectedDevice) return;
    const confirmed =
      (optimistic.stationId && selectedDevice.station_id === optimistic.stationId) ||
      (optimistic.isPaused !== undefined && selectedDevice.is_playing === !optimistic.isPaused);
    if (confirmed) setOptimistic(null);
  }, [selectedDevice, optimistic]);

  const stationById = useMemo(() => {
    const m = new Map<string, RadioStation>();
    stations.forEach(s => m.set(s.id, s));
    return m;
  }, [stations]);

  const send = useCallback((command: string) => {
    if (!selectedLocalId) return;
    sendRemoteCommand(selectedLocalId, command);
  }, [selectedLocalId, sendRemoteCommand]);

  // ── Remote volume — optimistic while dragging, throttled sends ───────────
  const [volDrag, setVolDrag] = useState<number | null>(null);
  const volSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volLastSentAt = useRef(0);

  const deviceVolume = (selectedDevice?.volume ?? 70) / 100;
  const shownVolume = volDrag ?? deviceVolume;

  const sendVolumeThrottled = useCallback((v: number) => {
    const fire = () => {
      volLastSentAt.current = Date.now();
      volSendTimer.current = null;
      if (selectedLocalId) sendRemoteCommand(selectedLocalId, `volume:${Math.round(v * 100)}`);
    };
    if (volSendTimer.current) clearTimeout(volSendTimer.current);
    const elapsed = Date.now() - volLastSentAt.current;
    if (elapsed >= 250) fire();
    else volSendTimer.current = setTimeout(fire, 250 - elapsed);
  }, [selectedLocalId, sendRemoteCommand]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolDrag(v);
    sendVolumeThrottled(v);
  }, [sendVolumeThrottled]);

  // Drop the optimistic value once the local reports the volume back
  useEffect(() => {
    if (volDrag === null || !selectedDevice) return;
    if (Math.abs((selectedDevice.volume ?? 70) / 100 - volDrag) <= 0.02) setVolDrag(null);
  }, [selectedDevice, volDrag]);

  // Reset optimistic volume when switching locals
  useEffect(() => { setVolDrag(null); }, [selectedLocalId]);

  useEffect(() => () => { if (volSendTimer.current) clearTimeout(volSendTimer.current); }, []);

  // Local name with optimistic override (server confirms via the 2s poll)
  const nameOf = useCallback(
    (d: RemoteDevice) => renamedNames[d.device_id] ?? d.device_name,
    [renamedNames],
  );

  // Drop the optimistic name once the server reports it back
  useEffect(() => {
    setRenamedNames(prev => {
      let changed = false;
      const next = { ...prev };
      remoteSessions.forEach(d => {
        if (next[d.device_id] && d.device_name === next[d.device_id]) {
          delete next[d.device_id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [remoteSessions]);

  const startRename = (d: RemoteDevice) => {
    setRenamingId(d.device_id);
    setRenameValue(nameOf(d));
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const saveRename = (deviceId: string) => {
    const name = renameValue.trim();
    if (name) {
      setRenamedNames(prev => ({ ...prev, [deviceId]: name }));
      sendRemoteCommand(deviceId, `rename:${name}`);
    }
    setRenamingId(null);
  };

  const pickStation = useCallback((station: RadioStation) => {
    setShowStationPicker(false);
    setStationSearch('');
    if (isSongActive(selectedDevice)) {
      setSwitchPending({ station, queueCount: selectedDevice?.song_queue?.length ?? 0 });
      return;
    }
    setOptimistic({ stationId: station.id, stationName: station.name });
    send(`play:${station.id}`);
  }, [selectedDevice, send]);

  const filteredStations = stations.filter(s =>
    stationSearch === '' || s.name.toLowerCase().includes(stationSearch.toLowerCase()),
  );

  // ── Derived "now playing" for the middle player ──────────────────────────
  const songMode = isSongActive(selectedDevice);
  const optStation = optimistic?.stationId ? stationById.get(optimistic.stationId) ?? null : null;
  const activeStation = optStation ?? (selectedDevice?.station_id ? stationById.get(selectedDevice.station_id) ?? null : null);

  const displayStationName = optimistic?.stationName ?? selectedDevice?.station_name ?? null;
  const isPlayingNow = optimistic?.isPaused !== undefined
    ? !optimistic.isPaused
    : (songMode ? selectedDevice?.song_state === 'playing' : !!selectedDevice?.is_playing);

  // Radio mode: show the song currently playing on that radio (from ICY/now-playing)
  const radioNowTitle = selectedDevice?.now_playing_title || null;
  const radioNowCover = selectedDevice?.now_playing_cover || null;
  // The controlled local flags a jingle (AutoDJ station ID/promo) in its
  // heartbeat — show it with a mic icon and keep it out of "previous".
  const remoteIsJingle = !songMode && !!selectedDevice?.now_playing_is_jingle;

  // Derive the previously played radio track client-side (same approach as the
  // main player): remember the now-playing title that just changed. The remote
  // heartbeat only carries the CURRENT track, and AutoDJ has no "previous".
  const [remotePrevious, setRemotePrevious] = useState<{ title: string; cover: string | null } | null>(null);
  const lastRemoteTitleRef = useRef('');
  const lastRemoteCoverRef = useRef<string | null>(null);

  // A different controlled local, or a station change, starts "previous" fresh.
  useEffect(() => {
    lastRemoteTitleRef.current = '';
    lastRemoteCoverRef.current = null;
    setRemotePrevious(null);
  }, [selectedLocalId, selectedDevice?.station_id]);

  useEffect(() => {
    if (songMode) return; // "previous" is a radio-only concept
    if (radioNowTitle && radioNowTitle !== lastRemoteTitleRef.current) {
      // Reveal the song before the change as "previous"…
      if (lastRemoteTitleRef.current) {
        setRemotePrevious({ title: lastRemoteTitleRef.current, cover: lastRemoteCoverRef.current });
      }
      // …but never record a jingle in history, so "previous" stays the real
      // song that played before the jingle.
      if (!remoteIsJingle) {
        lastRemoteTitleRef.current = radioNowTitle;
        lastRemoteCoverRef.current = radioNowCover;
      }
    }
  }, [radioNowTitle, radioNowCover, songMode, remoteIsJingle]);

  const title = songMode
    ? (selectedDevice?.song_title || 'Pesma')
    : (radioNowTitle || displayStationName || '');
  const subtitle = songMode
    ? (selectedDevice?.song_artist || '')
    : (remoteIsJingle ? 'Džingl' : (radioNowTitle ? (displayStationName || '') : (activeStation?.genre || '')));
  const cover = songMode
    ? (selectedDevice?.song_artwork || null)
    : (remoteIsJingle ? null : (radioNowCover || activeStation?.logo_url || null));
  const emoji = songMode ? null : (activeStation?.icon_emoji || '📻');
  const isLoadingSong = selectedDevice?.song_state === 'loading';
  const hasQueue = (selectedDevice?.song_queue?.length ?? 0) > 0;
  const nothingPlaying = !selectedDevice || (!songMode && !displayStationName);

  // What to block = whatever is playing on the controlled local right now.
  const blockTitle = songMode
    ? (selectedDevice?.song_artist ? `${selectedDevice.song_artist} - ${selectedDevice.song_title}` : (selectedDevice?.song_title || ''))
    : (radioNowTitle || '');
  const canBlock = !!selectedDevice && !!blockTitle;

  const handleBlockSong = async () => { if (!blockTitle) return; await blockSongByTitle(blockTitle); flashBlock('Pesma dodata u blacklist'); };
  const handleBlockArtist = async () => { if (!blockTitle) return; await blockArtistByTitle(blockTitle); flashBlock('Izvođač dodat u blacklist'); };

  // Skip on "Moj Radio" — the AutoDJ track is skipped per-account (server →
  // MediaCP), so the controlling phone can advance it directly; the controlled
  // local hears the new song on its next now-playing poll. Only for Moj Radio.
  const isMojRadioActive = !songMode && !!activeStation && activeStation.id.startsWith('moj-radio-');
  const [radioSkipping, setRadioSkipping] = useState(false);
  // Synchronous re-entry guard: a fast double-tap fires two onClicks before the
  // `radioSkipping` state (and the disabled attribute) can update, which would
  // skip the AutoDJ twice. The ref blocks the second call immediately, and the
  // 1.5s cooldown keeps the button locked while the AutoDJ actually advances.
  const skippingRef = useRef(false);
  const handleSkipRadio = async () => {
    if (!activeStation || skippingRef.current) return;
    skippingRef.current = true;
    setRadioSkipping(true);
    const res = await blacklistApi.skipMojRadio(activeStation.stream_url).catch(() => null);
    flashBlock(res && res.ok ? 'Preskočeno — nova pesma stiže' : 'Skip trenutno ne radi');
    setTimeout(() => { skippingRef.current = false; setRadioSkipping(false); }, 1500);
  };

  const togglePlay = () => {
    if (!selectedDevice) return;
    if (songMode) {
      send(selectedDevice.song_state === 'playing' ? 'song_pause' : 'song_resume');
    } else {
      const playing = isPlayingNow;
      setOptimistic({ isPaused: playing });
      send(playing ? 'pause' : 'resume');
    }
  };

  const localName = selectedDevice ? nameOf(selectedDevice) : 'Izaberi lokal';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-infinity-dark-900">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 pl-1 pr-2.5 py-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-infinity-dark-700 transition-colors active:scale-95"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-semibold">Nazad</span>
        </button>

        <button
          onClick={() => setShowBlacklist(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/25 border border-red-200/70 dark:border-red-800/40 shadow-sm active:scale-95 transition-all"
        >
          <Ban size={16} className="flex-shrink-0" />
          <span>Blacklist</span>
        </button>

        <button
          onClick={() => setShowLocalPicker(true)}
          className="flex items-center gap-1.5 max-w-[38%] pl-3 pr-2.5 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors active:scale-95"
        >
          <MapPin size={15} className="flex-shrink-0" />
          <span className="truncate">{localName}</span>
          <ChevronDown size={15} className="flex-shrink-0 opacity-80" />
        </button>
      </div>

      {/* Middle player */}
      <div className="flex-1 flex flex-col px-4 pb-2">
        {!selectedDevice ? (
          <div className="my-auto rounded-3xl bg-gray-900 h-[300px] flex flex-col items-center justify-center text-center px-8">
            {remoteSessions.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <WifiOff size={28} className="text-white/40" />
                </div>
                <p className="text-white font-semibold mb-1">Nema dostupnih lokala</p>
                <p className="text-white/50 text-sm">Otvori InfinityPlay na uređaju u lokalu da bi se ovde pojavio.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <MapPin size={28} className="text-white/40" />
                </div>
                <p className="text-white font-semibold mb-1">Izaberi lokal</p>
                <p className="text-white/50 text-sm mb-5">Odaberi lokal koji želiš da kontrolišeš.</p>
                <button
                  onClick={() => setShowLocalPicker(true)}
                  className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors active:scale-95"
                >
                  Izaberi lokal
                </button>
              </>
            )}
          </div>
        ) : (
          <>
          {/* Top spacer balances the message space below, keeping the card centred */}
          <div className="flex-1" />
          <div
            className="relative rounded-3xl overflow-hidden bg-gray-900 h-[360px] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.4)]"
            // clip-path is the reliable way to make iOS/Safari clip the blurred
            // cover backdrop (whose blur halo spills ~40px past the edge) to the
            // rounded corners — plain overflow-hidden + border-radius doesn't.
            style={{ clipPath: 'inset(0 round 24px)', transform: 'translateZ(0)' }}
          >
            {/* Blurred backdrop — round its OWN corners too (belt-and-suspenders
                with the parent translateZ) so iOS never shows square corners. */}
            {cover ? (
              // Overscan the blurred backdrop well past the card edges (-inset-10)
              // so the blur's own soft edge falls OUTSIDE the visible area — the
              // parent's rounded overflow-hidden then clips it cleanly, avoiding
              // the hard/abrupt edge you get when a blur exactly fills inset-0.
              <div
                className="absolute -inset-10 bg-cover bg-center"
                style={{ backgroundImage: `url(${cover})`, filter: 'blur(40px) brightness(0.55)' }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-violet-950 to-gray-900 rounded-3xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />

            {/* Previously played radio track — a smaller, muted echo on the
                left so the current track stays centred (radio mode only). */}
            {!songMode && remotePrevious && (
              <div
                className="flex absolute left-2 top-3 z-10 flex-col items-center gap-1.5 w-[76px] text-center pointer-events-none"
                style={{ animation: 'hero-text-in 0.6s ease-out 0.2s both' }}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
                  Prethodna
                </span>
                <div className="w-11 h-11 rounded-lg overflow-hidden shadow-lg bg-gradient-infinity flex items-center justify-center opacity-80">
                  {remotePrevious.cover ? (
                    <img src={remotePrevious.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <RadioIcon className="text-white/70" size={22} />
                  )}
                </div>
                <p className="text-[10px] text-white/60 leading-snug line-clamp-2 break-words w-full">
                  {remotePrevious.title}
                </p>
              </div>
            )}

            <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 text-center">
              {/* Cover */}
              <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0">
                {cover ? (
                  <img src={cover} alt={title} className="w-full h-full object-cover" />
                ) : songMode ? (
                  <Music className="text-white" size={46} />
                ) : remoteIsJingle ? (
                  <Mic2 className="text-white" size={46} />
                ) : (
                  <span className="text-5xl">{emoji}</span>
                )}
                {isLoadingSong && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Live/status pill */}
              <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                {songMode ? (
                  <><Headphones size={11} className="text-violet-300" /><span className="text-[10px] font-bold tracking-wider text-violet-200">DJ</span></>
                ) : isPlayingNow ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] font-bold tracking-wider text-red-300">UŽIVO</span></>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider text-white/50">PAUZIRANO</span>
                )}
              </div>

              <h2 className="text-white font-serif font-bold text-xl truncate w-full mb-1">
                {nothingPlaying ? 'Ništa se ne pušta' : title}
              </h2>
              <p className={`text-sm truncate w-full mb-6 ${isLoadingSong ? 'text-infinity-green-400 animate-pulse' : 'text-white/70'}`}>
                {isLoadingSong ? 'Učitava se...' : (nothingPlaying ? 'Izaberi stanicu ispod' : subtitle)}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVolumeChange(shownVolume > 0 ? 0 : 0.7)}
                  className="text-white/70 hover:text-white transition-colors"
                  title="Zvuk u lokalu"
                >
                  {shownVolume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <VolumeSlider
                  value={shownVolume}
                  onChange={handleVolumeChange}
                  onCommit={handleVolumeChange}
                  className="w-20"
                />

                <button
                  onClick={togglePlay}
                  disabled={isLoadingSong || nothingPlaying}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg disabled:opacity-60 disabled:hover:scale-100"
                >
                  {isLoadingSong ? (
                    <div className="w-6 h-6 border-2 border-gray-900/70 border-t-transparent rounded-full animate-spin" />
                  ) : isPlayingNow ? (
                    <Pause className="text-gray-900" size={26} />
                  ) : (
                    <Play className="text-gray-900 ml-1" size={26} fill="currentColor" />
                  )}
                </button>

                {songMode && hasQueue ? (
                  <button onClick={() => send('song_skip')} className="text-white/70 hover:text-white transition-colors" title="Preskoči pesmu">
                    <SkipForward size={22} />
                  </button>
                ) : isMojRadioActive ? (
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

              {songMode && (
                <button
                  onClick={() => send('song_stop')}
                  className="mt-5 flex items-center gap-1.5 text-white/60 hover:text-white bg-black/25 hover:bg-black/40 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Square size={11} fill="currentColor" />
                  Zaustavi i vrati radio
                </button>
              )}
            </div>
          </div>
          {/* Skip / block feedback — centered in the empty space below the
              card. The flex-1 here mirrors the top spacer, so the card stays
              vertically centred while the text sits nicely in the gap. */}
          <div className="flex-1 flex items-center justify-center px-4">
            {blockMsg && (
              <span className="text-sm font-semibold text-infinity-green-600 dark:text-infinity-green-400 text-center">
                {blockMsg}
              </span>
            )}
          </div>
          </>
        )}
      </div>

      {/* Block current (song / artist) — adds to your account blacklist */}
      {selectedDevice && (
        <div className="px-4 pt-1">
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={handleBlockSong}
              disabled={!canBlock}
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 hover:bg-red-100 dark:hover:bg-red-500/25 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
            >
              <Ban size={17} className="flex-shrink-0" />
              Blokiraj pesmu
            </button>
            <button
              onClick={handleBlockArtist}
              disabled={!canBlock}
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 hover:bg-red-100 dark:hover:bg-red-500/25 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
            >
              <Ban size={17} className="flex-shrink-0" />
              Blokiraj izvođača
            </button>
          </div>
        </div>
      )}

      {/* Bottom actions — DJ Manager (left) + Stanice (right) */}
      <div className="px-4 pb-7 pt-2 grid grid-cols-2 gap-3.5">
        <button
          ref={djButtonRef}
          onClick={() => selectedDevice && setIsDJOpen(true)}
          disabled={!selectedDevice}
          className="relative overflow-hidden rounded-3xl px-5 py-6 text-left active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #0f0a1e 0%, #1e0a3c 55%, #0f172a 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 30%, rgba(124,58,237,0.22) 0%, transparent 60%)' }} />
          <div className="relative flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/30 flex items-center justify-center">
              <Headphones size={26} className="text-violet-200" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-lg leading-tight">DJ Menadžer</p>
              <p className="text-xs text-violet-300/70 truncate mt-0.5">Pusti pesme</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => selectedDevice && setShowStationPicker(true)}
          disabled={!selectedDevice}
          className="relative overflow-hidden rounded-3xl px-5 py-6 text-left active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #0b1220 0%, #10233f 55%, #0b1220 100%)',
            border: '1px solid rgba(79,70,229,0.3)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 30%, rgba(79,70,229,0.24) 0%, transparent 60%)' }} />
          <div className="relative flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 flex items-center justify-center">
              <RadioIcon size={26} className="text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-lg leading-tight">Stanice</p>
              <p className="text-xs text-indigo-300/70 truncate mt-0.5">Promeni stanicu</p>
            </div>
          </div>
        </button>
      </div>

      {/* ── Local picker sheet ─────────────────────────────────────────── */}
      {showLocalPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLocalPicker(false)}>
          <div className="w-full max-w-md bg-white dark:bg-infinity-dark-800 rounded-t-3xl p-5 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Izaberi lokal</h3>
              <button onClick={() => setShowLocalPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
            </div>
            {remoteSessions.length === 0 ? (
              <div className="text-center py-8">
                <WifiOff size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Nijedan lokal nije trenutno povezan.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {remoteSessions.map(device => {
                  const active = device.device_id === selectedLocalId;
                  const editing = renamingId === device.device_id;
                  return (
                    <div
                      key={device.device_id}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                        active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="relative w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                        <Wifi size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-infinity-dark-800" />
                      </div>

                      {editing ? (
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRename(device.device_id); if (e.key === 'Escape') setRenamingId(null); }}
                            placeholder="Naziv lokala"
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg border border-indigo-400 bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                            style={{ fontSize: '16px' }}
                          />
                          <button onClick={() => saveRename(device.device_id)} className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center">
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setSelectedLocalId(device.device_id); setShowLocalPicker(false); setOptimistic(null); }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nameOf(device)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {device.station_name ? device.station_name : 'Nije aktivno'}
                            </p>
                          </button>
                          <button
                            onClick={() => startRename(device)}
                            className="flex-shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-center transition-colors"
                            title="Preimenuj lokal"
                          >
                            <Pencil size={15} />
                          </button>
                          {active && <Check size={18} className="text-indigo-500 flex-shrink-0" />}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Station picker — full-screen page (radio-mode card design) ──── */}
      {showStationPicker && selectedDevice && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-infinity-dark-900">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setShowStationPicker(false); setStationSearch(''); }}
                className="flex items-center gap-1 pl-1 pr-3 py-2 -ml-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors active:scale-95"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-semibold">Nazad</span>
              </button>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Stanice</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Pušta se u: {nameOf(selectedDevice)}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={stationSearch}
                onChange={e => setStationSearch(e.target.value)}
                placeholder="Pretraži stanicu..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                style={{ fontSize: '16px' }}
              />
              {stationSearch && (
                <button onClick={() => setStationSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Station grid — same card design as the radio dashboard */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {filteredStations.length === 0 ? (
              <div className="text-center py-16">
                <RadioIcon className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                <p className="text-gray-500 dark:text-gray-400">Nije pronađena nijedna stanica</p>
              </div>
            ) : (
              <>
                {/* Moj Radio — designed card, full width, on top (as on the radio dashboard) */}
                {(() => {
                  const mojRadio = filteredStations.find(s => s.id.startsWith('moj-radio-'));
                  if (!mojRadio) return null;
                  const activeId = optimistic?.stationId ?? selectedDevice.station_id;
                  return (
                    <MojRadioCard
                      isPlaying={!songMode && activeId === mojRadio.id}
                      onClick={() => pickStation(mojRadio)}
                    />
                  );
                })()}

                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredStations
                    .filter(s => !s.id.startsWith('moj-radio-'))
                    .map(station => (
                      <StationCard
                        key={station.id}
                        station={station}
                        isCurrentlyPlaying={!songMode && (optimistic?.stationId ?? selectedDevice.station_id) === station.id}
                        onClick={pickStation}
                      />
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Station switch timing modal (song is active) ───────────────── */}
      {switchPending && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSwitchPending(null)}>
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-indigo-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{switchPending.station.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kada prebaciti stanicu?</p>
              </div>
              <button onClick={() => setSwitchPending(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => { const st = switchPending.station; setOptimistic({ stationId: st.id, stationName: st.name }); send(`play:${st.id}`); setSwitchPending(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Play size={15} fill="currentColor" /> Odmah
              </button>
              <button
                onClick={() => { send(`switch_after_song:${switchPending.station.id}`); setSwitchPending(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Clock size={15} /> Nakon ove pesme
              </button>
              {switchPending.queueCount >= 1 && (
                <button
                  onClick={() => { send(`switch_after_songs:1:${switchPending.station.id}`); setSwitchPending(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
                >
                  <Clock size={15} /> Nakon još 2 pesme
                </button>
              )}
              {switchPending.queueCount >= 2 && (
                <button
                  onClick={() => { send(`switch_after_songs:2:${switchPending.station.id}`); setSwitchPending(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
                >
                  <Clock size={15} /> Nakon još 3 pesme
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DJ Manager — pre-targeted to the selected local */}
      <DJManagerOverlay
        isOpen={isDJOpen}
        onClose={() => setIsDJOpen(false)}
        remoteSessions={remoteSessions}
        sendRemoteCommand={sendRemoteCommand}
        buttonRef={djButtonRef}
        initialLocationId={selectedLocalId}
      />

      {/* Blacklist — view / search / restore blocked songs & artists */}
      <BlacklistModal isOpen={showBlacklist} onClose={() => setShowBlacklist(false)} />
    </div>
  );
}
