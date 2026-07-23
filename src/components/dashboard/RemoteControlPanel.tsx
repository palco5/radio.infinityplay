import { useState, useCallback, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Tablet, Play, Pause, Radio, ChevronDown, ChevronUp, Wifi, Search, Loader, Pencil, Music, Square, SkipForward, Clock, X } from 'lucide-react';
import { RemoteDevice } from '../../hooks/useRemoteSession';
import { RadioStation } from '../../types';

interface RemoteControlPanelProps {
  devices: RemoteDevice[];
  myDeviceType: string;
  stations: RadioStation[];
  onSendCommand: (targetDeviceId: string, command: string) => void;
}

interface OptimisticState {
  deviceId: string;
  stationId: string;
  stationName: string;
  isPaused?: boolean;
}

function DeviceIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'desktop') return <Monitor size={size} />;
  if (type === 'tablet') return <Tablet size={size} />;
  return <Smartphone size={size} />;
}

const EQ_TIMINGS = [0.55, 0.7, 0.5, 0.65, 0.6, 0.75, 0.5];

function MojRadioCard({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="mb-3 relative rounded-xl overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-indigo-950 to-purple-950" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(139,92,246,0.25) 0%, transparent 65%)' }} />

      <div className="relative flex items-center gap-3 px-3 py-2.5">
        {/* Spinning vinyl record */}
        <div
          className="relative w-12 h-12 flex-shrink-0 rounded-full"
          style={{ animation: 'vinyl-spin 4s linear infinite', animationPlayState: isPlaying ? 'running' : 'paused' }}
        >
          {/* Disc body */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-900 via-[#1a1a2e] to-gray-900 shadow-lg" />
          {/* Grooves */}
          <div className="absolute inset-[2px] rounded-full border border-gray-600/25" />
          <div className="absolute inset-[5px] rounded-full border border-gray-600/25" />
          <div className="absolute inset-[8px] rounded-full border border-gray-600/25" />
          <div className="absolute inset-[11px] rounded-full border border-gray-600/20" />
          {/* Shine */}
          <div className="absolute top-[6px] left-[8px] w-3 h-[3px] rounded-full bg-white/12 -rotate-12" />
          {/* Center label */}
          <div className="absolute inset-[13px] rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </div>
        </div>

        {/* Station info + EQ bars */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white/90 mb-2">📻 Moj Radio</p>
          <div className="flex items-end gap-[3px] h-[18px]">
            {EQ_TIMINGS.map((dur, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full flex-shrink-0"
                style={{
                  background: 'linear-gradient(to top, #7c3aed, #e879f9)',
                  animation: `eq-bar ${dur}s ease-in-out infinite`,
                  animationDelay: `${i * 0.06}s`,
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transformOrigin: 'bottom',
                  height: '100%',
                }}
              />
            ))}
          </div>
        </div>

        {/* LIVE badge */}
        {isPlaying && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RemoteControlPanel({ devices, myDeviceType, stations, onSendCommand }: RemoteControlPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [stationPickerFor, setStationPickerFor] = useState<string | null>(null);
  const [stationSearch, setStationSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [optimistic, setOptimistic] = useState<OptimisticState | null>(null);

  // Rename state
  const [renamingDevice, setRenamingDevice] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deviceNames, setDeviceNames] = useState<Record<string, string>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Station-change options modal (when target device has active song)
  const [stationSwitchPending, setStationSwitchPending] = useState<{ deviceId: string; station: RadioStation; queueCount: number } | null>(null);
  // Resume playlist modal
  const [resumeModalFor, setResumeModalFor] = useState<string | null>(null);

  // Clear optimistic state once server confirms the change
  useEffect(() => {
    if (!optimistic) return;
    const device = devices.find(d => d.device_id === optimistic.deviceId);
    if (!device) return;
    const confirmed =
      // Station switch confirmed
      (optimistic.stationId && device.station_id === optimistic.stationId) ||
      // Play/pause confirmed — only check this path when isPaused is set
      (optimistic.isPaused !== undefined && device.is_playing === !optimistic.isPaused);
    if (confirmed) setOptimistic(null);
  }, [devices, optimistic]);

  // Clear local name override once server confirms the rename
  useEffect(() => {
    devices.forEach(d => {
      if (deviceNames[d.device_id] && d.device_name === deviceNames[d.device_id]) {
        setDeviceNames(prev => {
          const next = { ...prev };
          delete next[d.device_id];
          return next;
        });
      }
    });
  }, [devices]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendStation = useCallback((deviceId: string, station: RadioStation) => {
    const device = devices.find(d => d.device_id === deviceId);
    const hasSong = device && (device.song_state === 'playing' || device.song_state === 'paused' || device.song_state === 'loading');
    setStationPickerFor(null);
    setStationSearch('');
    setShowSearch(false);
    if (hasSong) {
      // Show options modal instead of switching immediately
      setStationSwitchPending({ deviceId, station, queueCount: device.song_queue?.length ?? 0 });
      return;
    }
    setOptimistic({ deviceId, stationId: station.id, stationName: station.name });
    onSendCommand(deviceId, `play:${station.id}`);
  }, [devices, onSendCommand]);

  const sendPlayPause = useCallback((deviceId: string, isCurrentlyPlaying: boolean) => {
    setOptimistic({ deviceId, stationId: '', stationName: '', isPaused: isCurrentlyPlaying });
    onSendCommand(deviceId, isCurrentlyPlaying ? 'pause' : 'resume');
  }, [onSendCommand]);

  const handleOpenPicker = (deviceId: string) => {
    if (stationPickerFor === deviceId) {
      setStationPickerFor(null);
      setStationSearch('');
      setShowSearch(false);
    } else {
      setStationPickerFor(deviceId);
      setStationSearch('');
      setShowSearch(false);
    }
  };

  const handleStartRename = (device: RemoteDevice) => {
    setRenamingDevice(device.device_id);
    setRenameValue(deviceNames[device.device_id] || device.device_name || '');
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleSaveRename = useCallback((deviceId: string) => {
    const name = renameValue.trim();
    if (name) {
      setDeviceNames(prev => ({ ...prev, [deviceId]: name }));
      onSendCommand(deviceId, `rename:${name}`);
    }
    setRenamingDevice(null);
  }, [renameValue, onSendCommand]);

  // On desktop: small indicator
  if (myDeviceType === 'desktop') {
    if (devices.length === 0) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-infinity-green-50 dark:bg-infinity-green-900/20 rounded-xl border border-infinity-green-200 dark:border-infinity-green-800 text-sm">
        <Wifi size={14} className="text-infinity-green-600 dark:text-infinity-green-400" />
        <span className="text-infinity-green-700 dark:text-infinity-green-300 font-medium">
          {devices.length} {devices.length === 1 ? 'uređaj' : 'uređaja'} {devices.length === 1 ? 'povezan' : 'povezano'}
        </span>
        <div className="flex gap-1 ml-1">
          {devices.map(d => (
            <span key={d.device_id} className="text-infinity-green-500 dark:text-infinity-green-400">
              <DeviceIcon type={d.device_type} size={14} />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (devices.length === 0) return null;

  const filteredStations = stations.filter(s =>
    stationSearch === '' || s.name.toLowerCase().includes(stationSearch.toLowerCase())
  );

  return (
    <div className="mb-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Wifi size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Daljinski upravljač</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              {devices.length} {devices.length === 1 ? 'uređaj dostupan' : 'uređaja dostupno'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-indigo-500" />}
      </button>

      {expanded && (
        <div className="border-t border-indigo-200 dark:border-indigo-800">
          {devices.map(device => {
            const isOpt = optimistic?.deviceId === device.device_id;
            const isPending = isOpt && !!optimistic;
            const displayStationName = isOpt && optimistic.stationName
              ? optimistic.stationName
              : device.station_name;
            const displayIsPlaying = isOpt && optimistic.isPaused !== undefined
              ? !optimistic.isPaused
              : device.is_playing;
            const displayDeviceName = deviceNames[device.device_id] ?? device.device_name;

            return (
              <div key={device.device_id} className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-900 last:border-b-0">
                {/* Device header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                      <DeviceIcon type={device.device_type} size={18} />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-indigo-950"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Device name with rename */}
                      {renamingDevice === device.device_id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename(device.device_id);
                            if (e.key === 'Escape') setRenamingDevice(null);
                          }}
                          onBlur={() => handleSaveRename(device.device_id)}
                          className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 bg-white dark:bg-indigo-900/50 border border-indigo-400 rounded px-1.5 outline-none w-full max-w-[140px]"
                        />
                      ) : (
                        <button
                          onClick={() => handleStartRename(device)}
                          className="flex items-center gap-1 group/rename max-w-full"
                        >
                          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 truncate">{displayDeviceName}</p>
                          <Pencil size={10} className="text-indigo-300 dark:text-indigo-600 group-hover/rename:text-indigo-500 flex-shrink-0" />
                        </button>
                      )}
                      {displayStationName ? (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                          {isPending && !optimistic?.stationName ? null : <Radio size={10} className="flex-shrink-0" />}
                          <span className="truncate">{displayStationName}</span>
                          {displayIsPlaying && !isPending && (
                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0 ml-1" />
                          )}
                          {isPending && (
                            <Loader size={10} className="flex-shrink-0 ml-1 animate-spin text-indigo-400" />
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-indigo-400 dark:text-indigo-500">Nije aktivno</p>
                      )}
                    </div>
                  </div>

                  {/* Radio Pause/Resume — hidden when song is active (moved into song controls) */}
                  {!(device.song_state === 'playing' || device.song_state === 'paused' || device.song_state === 'loading') && (
                    <button
                      onClick={() => sendPlayPause(device.device_id, displayIsPlaying)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-2 active:scale-95 ${
                        displayIsPlaying
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}
                    >
                      {displayIsPlaying
                        ? <><Pause size={12} /> Pauziraj</>
                        : <><Play size={12} /> Aktiviraj</>
                      }
                    </button>
                  )}
                </div>

                {/* Song controls — shown when a YouTube song is active */}
                {(device.song_state === 'playing' || device.song_state === 'paused' || device.song_state === 'loading') && (
                  <div className="mb-3 px-3 py-2.5 bg-violet-900/30 border border-violet-700/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Music size={12} className="text-violet-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {device.song_title || 'Pesma'}
                        </p>
                        {device.song_artist && (
                          <p className="text-[10px] text-violet-300 truncate">{device.song_artist}</p>
                        )}
                      </div>
                      {device.song_state === 'loading' && (
                        <Loader size={12} className="text-violet-400 animate-spin flex-shrink-0" />
                      )}
                    </div>
                    {/* Song playback controls */}
                    <div className="flex gap-2 mb-2">
                      {device.song_state === 'playing' ? (
                        <button
                          onClick={() => onSendCommand(device.device_id, 'song_pause')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-700/60 hover:bg-violet-700 text-violet-100 text-xs font-semibold transition-colors active:scale-95"
                        >
                          <Pause size={11} /> Pauziraj
                        </button>
                      ) : device.song_state === 'paused' ? (
                        <button
                          onClick={() => onSendCommand(device.device_id, 'song_resume')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-700/60 hover:bg-violet-700 text-violet-100 text-xs font-semibold transition-colors active:scale-95"
                        >
                          <Play size={11} /> Nastavi
                        </button>
                      ) : (
                        <div className="flex-1" />
                      )}
                      <button
                        onClick={() => onSendCommand(device.device_id, 'song_skip')}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-700/60 hover:bg-violet-700 text-violet-100 text-xs font-semibold transition-colors active:scale-95"
                        title="Preskoči pesmu"
                      >
                        <SkipForward size={11} /> Skip
                      </button>
                      <button
                        onClick={() => onSendCommand(device.device_id, 'song_stop')}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold transition-colors active:scale-95"
                      >
                        <Square size={10} fill="currentColor" /> Stop
                      </button>
                    </div>
                    {/* Back to radio — stops the song and restores radio playback */}
                    <button
                      onClick={() => onSendCommand(device.device_id, 'song_stop')}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-700/40"
                    >
                      <Radio size={10} />
                      Vrati se na radio
                    </button>
                  </div>
                )}

                {/* Moj Radio card */}
                {displayStationName === 'Moj Radio' && (
                  <MojRadioCard isPlaying={displayIsPlaying} />
                )}

                {/* Station picker toggle */}
                {/* Saved playlist resume — shown when device has a preserved playlist */}
                {device.saved_playlist_count > 0 && (
                  <div className="mb-2 px-3 py-2 rounded-xl bg-violet-900/20 border border-violet-700/30 flex items-center gap-2">
                    <Music size={12} className="text-violet-400 flex-shrink-0" />
                    <p className="text-xs text-violet-300 flex-1">Sačuvana playlista · {device.saved_playlist_count} {device.saved_playlist_count === 1 ? 'pesma' : 'pesme'}</p>
                    <button
                      onClick={() => setResumeModalFor(device.device_id)}
                      className="text-xs font-semibold text-violet-300 hover:text-violet-100 underline"
                    >
                      Nastavi
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleOpenPicker(device.device_id)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 active:scale-[0.98] transition-all"
                >
                  <Radio size={12} />
                  Promeni stanicu
                  {stationPickerFor === device.device_id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Station picker */}
                {stationPickerFor === device.device_id && (
                  <div className="mt-2">
                    {/* Search */}
                    <div className="flex items-center gap-2 mb-2">
                      {showSearch ? (
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={stationSearch}
                            onChange={e => setStationSearch(e.target.value)}
                            placeholder="Pretraži stanice..."
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-indigo-950/60 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSearch(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                          <Search size={12} />
                          Pretraži
                        </button>
                      )}
                      <span className="text-xs text-indigo-400 ml-auto">{filteredStations.length} stanica</span>
                    </div>

                    {/* List */}
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredStations.map(station => {
                        const isActive = (isOpt ? optimistic?.stationId : device.station_id) === station.id;
                        return (
                          <button
                            key={station.id}
                            onClick={() => sendStation(device.device_id, station)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all active:scale-[0.98] ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white dark:bg-indigo-950/40 text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'
                            }`}
                          >
                            {station.logo_url ? (
                              <img src={station.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0 text-base">
                                {(station as any).icon_emoji || <Radio size={14} className="text-indigo-600 dark:text-indigo-400" />}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{station.name}</p>
                              <p className={`text-xs truncate ${isActive ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {station.genre}
                              </p>
                            </div>
                            {isActive && (
                              <span className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Station switch options modal */}
      {stationSwitchPending && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setStationSwitchPending(null)}
        >
          <div
            className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-indigo-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{stationSwitchPending.station.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kada prebaciti stanicu?</p>
              </div>
              <button onClick={() => setStationSwitchPending(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const { deviceId, station } = stationSwitchPending;
                  setOptimistic({ deviceId, stationId: station.id, stationName: station.name });
                  onSendCommand(deviceId, `play:${station.id}`);
                  setStationSwitchPending(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Play size={15} fill="currentColor" /> Odmah
              </button>
              <button
                onClick={() => {
                  const { deviceId, station } = stationSwitchPending;
                  onSendCommand(deviceId, `switch_after_song:${station.id}`);
                  setStationSwitchPending(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Clock size={15} /> Nakon ove pesme
              </button>
              {stationSwitchPending.queueCount >= 1 && (
                <button
                  onClick={() => {
                    const { deviceId, station } = stationSwitchPending;
                    onSendCommand(deviceId, `switch_after_songs:1:${station.id}`);
                    setStationSwitchPending(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
                >
                  <Clock size={15} /> Nakon još 2 pesme
                </button>
              )}
              {stationSwitchPending.queueCount >= 2 && (
                <button
                  onClick={() => {
                    const { deviceId, station } = stationSwitchPending;
                    onSendCommand(deviceId, `switch_after_songs:2:${station.id}`);
                    setStationSwitchPending(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
                >
                  <Clock size={15} /> Nakon još 3 pesme
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resume saved playlist modal */}
      {resumeModalFor && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setResumeModalFor(null)}
        >
          <div
            className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-violet-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music size={16} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">Nastavi playlistu</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kada pokrenuti?</p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => { onSendCommand(resumeModalFor, 'resume_saved_now'); setResumeModalFor(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Play size={15} fill="currentColor" /> Odmah
              </button>
              <button
                onClick={() => { onSendCommand(resumeModalFor, 'resume_saved_after'); setResumeModalFor(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-indigo-900/40 hover:bg-gray-200 dark:hover:bg-indigo-900/60 text-gray-900 dark:text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Clock size={15} /> Nakon ove pesme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
