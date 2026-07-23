import { Volume2, VolumeX, Play, Pause, Radio, Minimize2, SkipForward } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer, formatSongTime } from '../../contexts/SongPlayerContext';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import NowPlayingIndicator from './NowPlayingIndicator';

export default function AudioPlayer() {
  const { currentStation, isPlaying, volume, nowPlayingTitle, nowPlayingCover, pause, playStation, setVolume, playJingle } = useAudio();
  const { songState, currentSong, songQueue, currentTime, duration, pauseSong, resumeSong, skipSong, seekTo, stopSong } = useSongPlayer();
  const [isMinimized, setIsMinimized] = useState(false);
  const { user, profile } = useAuth();
  const lastJingleTimeRef = useRef<number>(Date.now());
  const jingleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekingRef = useRef(false);
  const [seekValue, setSeekValue] = useState(0);

  const isSongActive = songState === 'playing' || songState === 'paused' || songState === 'loading';

  // Sync seek slider with currentTime (unless user is dragging)
  useEffect(() => {
    if (!seekingRef.current) setSeekValue(currentTime);
  }, [currentTime]);

  // Jingle Logic (only when radio plays, not song)
  useEffect(() => {
    if (!user || !isPlaying || !currentStation || isSongActive) {
      if (jingleIntervalRef.current) { clearInterval(jingleIntervalRef.current); jingleIntervalRef.current = null; }
      return;
    }
    if (!profile?.jingle_url) return;
    const intervalMs = (profile.jingle_interval_minutes || 7) * 60 * 1000;
    jingleIntervalRef.current = setInterval(() => {
      if (Date.now() - lastJingleTimeRef.current >= intervalMs) {
        playJingle(profile.jingle_url!);
        lastJingleTimeRef.current = Date.now();
      }
    }, 10000);
    return () => { if (jingleIntervalRef.current) clearInterval(jingleIntervalRef.current); };
  }, [user, isPlaying, currentStation, isSongActive, playJingle, profile]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value));
  const toggleMute = () => volume > 0 ? setVolume(0) : setVolume(0.7);

  const handleSeekStart = () => { seekingRef.current = true; };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => setSeekValue(parseFloat(e.target.value));
  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekingRef.current = false;
    seekTo(parseFloat(e.target.value));
  };

  // Nothing to show
  if (!isSongActive && !currentStation) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 bg-gradient-infinity rounded-full shadow-glow-green-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Radio className="text-white animate-pulse" size={28} />
        </button>
      </div>
    );
  }

  // ── SONG MODE ──────────────────────────────────────────────────────────────
  if (isSongActive && currentSong) {
    const isLoading = songState === 'loading';
    const isPaused = songState === 'paused';
    const progress = duration > 0 ? (seekValue / duration) * 100 : 0;

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-infinity-dark-900/95 backdrop-blur-lg border-t-2 border-violet-500 shadow-2xl">
        <div className="container mx-auto px-4 py-3">
          {/* Main row */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Artwork */}
            <div className="relative flex-shrink-0">
              <img
                src={currentSong.artwork}
                alt={currentSong.title}
                className="w-11 h-11 md:w-12 md:h-12 rounded-lg object-cover shadow-md"
                style={{ animation: !isPaused && !isLoading ? 'vinyl-spin 8s linear infinite' : 'none' }}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Title + progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate leading-tight">
                    {currentSong.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentSong.artist}
                    {songQueue.length > 0 && (
                      <span className="ml-2 text-violet-500">+{songQueue.length} u redu</span>
                    )}
                  </p>
                </div>

                {/* Desktop: time display */}
                {!isLoading && (
                  <span className="hidden md:block text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums">
                    {formatSongTime(seekValue)} / {formatSongTime(duration)}
                  </span>
                )}
              </div>

              {/* Timeline */}
              {!isLoading && (
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                    {formatSongTime(seekValue)}
                  </span>
                  <div className="relative flex-1 h-1.5 group">
                    <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-none"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.5}
                      value={seekValue}
                      onMouseDown={handleSeekStart}
                      onTouchStart={handleSeekStart}
                      onChange={handleSeekChange}
                      onMouseUp={handleSeekEnd}
                      onTouchEnd={handleSeekEnd as any}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                    />
                  </div>
                  <span className="md:hidden text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                    {formatSongTime(duration)}
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={isPaused ? resumeSong : pauseSong}
                disabled={isLoading}
                className="w-11 h-11 md:w-12 md:h-12 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors shadow-md"
              >
                {isPaused || isLoading ? (
                  <Play className="text-white ml-0.5" size={20} fill="currentColor" />
                ) : (
                  <Pause className="text-white" size={20} />
                )}
              </button>

              {/* Skip button — all devices */}
              <button
                onClick={skipSong}
                disabled={isLoading}
                className="w-9 h-9 md:w-10 md:h-10 bg-violet-100 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-800/60 disabled:opacity-40 rounded-full flex items-center justify-center transition-colors"
                title="Preskoči pesmu"
              >
                <SkipForward className="text-violet-600 dark:text-violet-400" size={18} />
              </button>

              {/* Desktop: volume + minimize */}
              <div className="hidden md:flex items-center gap-2 ml-1">
                <button onClick={toggleMute} className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-800 rounded-full transition-colors">
                  {volume === 0 ? <VolumeX className="text-gray-500" size={18} /> : <Volume2 className="text-violet-500" size={18} />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-800 rounded-full transition-colors"
                >
                  <Minimize2 className="text-gray-500" size={16} />
                </button>
              </div>

              {/* Mobile: stop button */}
              <button
                onClick={stopSong}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-800 transition-colors"
                title="Zaustavi"
              >
                <span className="text-gray-500 text-sm font-bold">✕</span>
              </button>
            </div>
          </div>

          {/* Mobile: volume row */}
          <div className="md:hidden mt-2 flex items-center gap-3">
            <button onClick={toggleMute} className="p-1">
              {volume === 0 ? <VolumeX className="text-gray-500" size={16} /> : <Volume2 className="text-violet-500" size={16} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            <button onClick={() => setIsMinimized(true)} className="p-1">
              <Minimize2 className="text-gray-500" size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RADIO MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-infinity-dark-900/95 backdrop-blur-lg border-t-2 border-infinity-green-500 shadow-2xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-infinity rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-green overflow-hidden">
              {nowPlayingCover ? (
                <img
                  src={nowPlayingCover}
                  alt={nowPlayingTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Radio className="text-white" size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-lg font-serif font-bold text-gray-900 dark:text-white truncate">
                  {currentStation?.name}
                </h4>
                <NowPlayingIndicator />
              </div>
              {nowPlayingTitle ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{nowPlayingTitle}</p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{currentStation?.genre}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => (isPlaying ? pause() : currentStation && playStation(currentStation))}
              className="w-14 h-14 bg-gradient-infinity rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              {isPlaying ? <Pause className="text-white" size={24} /> : <Play className="text-white ml-1" size={24} />}
            </button>

            <div className="hidden md:flex items-center space-x-3">
              <button onClick={toggleMute} className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors">
                {volume === 0 ? <VolumeX className="text-gray-600 dark:text-gray-400" size={20} /> : <Volume2 className="text-infinity-green-600" size={20} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-200 dark:bg-infinity-dark-700 rounded-lg appearance-none cursor-pointer accent-infinity-green-600"
              />
              <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors">
                <Minimize2 className="text-gray-600 dark:text-gray-400" size={20} />
              </button>
            </div>
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)}><Minimize2 size={20} /></Button>
            </div>
          </div>
        </div>

        <div className="md:hidden mt-3 flex items-center justify-center space-x-3">
          <button onClick={toggleMute} className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors">
            {volume === 0 ? <VolumeX className="text-gray-600 dark:text-gray-400" size={20} /> : <Volume2 className="text-infinity-green-600" size={20} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-200 dark:bg-infinity-dark-700 rounded-lg appearance-none cursor-pointer accent-infinity-green-600"
          />
        </div>
      </div>
    </div>
  );
}
