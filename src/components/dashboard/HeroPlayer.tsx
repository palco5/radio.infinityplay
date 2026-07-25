import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, Radio as RadioIcon, Music } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer } from '../../contexts/SongPlayerContext';
import NowPlayingIndicator from '../player/NowPlayingIndicator';

const PAUSE_GRACE_MS = 10000;

// Static "now playing" hero — always occupies the top slot where the old
// analytics/quick-access cards used to be. No flying/growing from the
// station card; content just cross-fades in place.
export default function HeroPlayer() {
  const { currentStation, isPlaying, pause, playStation, volume, setVolume, nowPlayingTitle, nowPlayingCover } = useAudio();
  const { songState, currentSong, pauseSong, resumeSong, skipSong, songQueue } = useSongPlayer();

  const isSongActiveNow = songState === 'playing' || songState === 'paused' || songState === 'loading';
  const mode: 'song' | 'radio' | 'none' = isSongActiveNow ? 'song' : currentStation ? 'radio' : 'none';
  const isPlayingNow = mode === 'song' ? songState === 'playing' : mode === 'radio' ? isPlaying : false;

  const [forceClosed, setForceClosed] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resuming/starting playback always cancels any pending revert-to-idle.
  useEffect(() => {
    if (isPlayingNow) setForceClosed(false);
  }, [isPlayingNow]);

  // 10s pause grace — after this, the hero reverts to its idle placeholder.
  useEffect(() => {
    if (mode !== 'none' && !isPlayingNow && !(mode === 'song' && songState === 'loading')) {
      pauseTimerRef.current = setTimeout(() => setForceClosed(true), PAUSE_GRACE_MS);
      return () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); };
    }
  }, [mode, isPlayingNow, songState]);

  const active = mode !== 'none' && !forceClosed;

  const cover = mode === 'song' ? currentSong?.artwork ?? null : nowPlayingCover;
  const title = mode === 'song' ? (currentSong?.title ?? '') : (nowPlayingTitle || currentStation?.genre || '');
  const subtitle = mode === 'song' ? (currentSong?.artist ?? '') : (currentStation?.name ?? '');
  const showSkip = mode === 'song' && songQueue.length > 0;

  const handleTogglePlay = () => {
    if (mode === 'song') {
      songState === 'playing' ? pauseSong() : resumeSong();
    } else if (mode === 'radio' && currentStation) {
      isPlaying ? pause() : playStation(currentStation);
    }
  };

  return (
    <div className="relative w-full h-[280px] md:h-[360px] rounded-3xl overflow-hidden mb-6 md:mb-8 shadow-xl bg-gray-100 dark:bg-infinity-dark-800">
      {/* Blurred cover background */}
      {cover && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url(${cover})`,
            filter: 'blur(40px) brightness(0.55)',
            transform: 'scale(1.3)',
            opacity: active ? 1 : 0,
          }}
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50 transition-opacity duration-500"
        style={{ opacity: active ? 1 : 0 }}
      />

      {/* Idle placeholder */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300"
        style={{ opacity: active ? 0 : 1, pointerEvents: active ? 'none' : 'auto' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-infinity-dark-700 flex items-center justify-center">
          <Music className="text-gray-400 dark:text-gray-500" size={28} />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
          Izaberi stanicu da počneš sa slušanjem
        </p>
      </div>

      {/* Now playing content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 py-6 text-center transition-opacity duration-300"
        style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
      >
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0">
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <RadioIcon className="text-white" size={48} />
          )}
        </div>

        <div className="flex items-center gap-2 mb-1 max-w-full">
          <h2 className="text-gray-900 dark:text-white font-serif font-bold text-lg md:text-xl truncate max-w-[80vw]">
            {title || 'Nema podataka'}
          </h2>
          {isPlayingNow && <NowPlayingIndicator />}
        </div>
        <p className="text-gray-600 dark:text-white/70 text-sm md:text-base truncate max-w-[80vw] mb-5">{subtitle}</p>

        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => (volume > 0 ? setVolume(0) : setVolume(0.7))}
            className="text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 md:w-28 h-1.5 bg-gray-300 dark:bg-white/25 rounded-lg appearance-none cursor-pointer accent-infinity-green-500"
          />

          <button
            onClick={handleTogglePlay}
            className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            {isPlayingNow ? (
              <Pause className="text-gray-900" size={26} />
            ) : (
              <Play className="text-gray-900 ml-1" size={26} fill="currentColor" />
            )}
          </button>

          {showSkip ? (
            <button onClick={skipSong} className="text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors" title="Preskoči pesmu">
              <SkipForward size={22} />
            </button>
          ) : (
            <div className="w-[22px]" />
          )}
        </div>
      </div>
    </div>
  );
}
