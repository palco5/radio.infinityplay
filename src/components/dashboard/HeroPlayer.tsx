import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, Radio as RadioIcon } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useSongPlayer } from '../../contexts/SongPlayerContext';
import NowPlayingIndicator from '../player/NowPlayingIndicator';

const PAUSE_GRACE_MS = 10000;

// Static "now playing" hero — always occupies the top slot where the old
// analytics/quick-access cards used to be. The box itself never moves; only
// its content changes, with a staggered pop-in animation each time playback
// starts (achieved by actually mounting/unmounting the content so the CSS
// keyframes replay every time, rather than just toggling opacity).
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
    <div className="relative w-full h-[280px] md:h-[360px] rounded-3xl overflow-hidden mb-6 md:mb-8 shadow-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-infinity-dark-800 dark:to-infinity-dark-900">
      {!active ? (
        // ── Idle frame ──────────────────────────────────────────────────
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center w-20 h-20">
            <span
              className="absolute inset-0 rounded-full border-2 border-infinity-green-400/60"
              style={{ animation: 'hero-idle-ring 2.4s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-infinity-green-400/60"
              style={{ animation: 'hero-idle-ring 2.4s ease-out infinite', animationDelay: '1.2s' }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl bg-gradient-infinity flex items-center justify-center shadow-glow-green"
              style={{ animation: 'hero-idle-pulse 2.4s ease-in-out infinite' }}
            >
              <RadioIcon className="text-white" size={26} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-200 font-serif font-bold text-base md:text-lg">Spreman za muziku</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Izaberi stanicu ispod da počneš</p>
          </div>
        </div>
      ) : (
        // ── Now playing ─────────────────────────────────────────────────
        <div className="absolute inset-0">
          {cover && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${cover})`,
                filter: 'blur(40px) brightness(0.55)',
                animation: 'hero-bg-in 1.2s ease-out forwards',
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />

          <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 text-center">
            <div
              className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-xl bg-gradient-infinity flex items-center justify-center mb-4 flex-shrink-0"
              style={{ animation: 'hero-cover-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {cover ? (
                <img src={cover} alt={title} className="w-full h-full object-cover" />
              ) : (
                <RadioIcon className="text-white" size={48} />
              )}
            </div>

            <div
              className="flex items-center gap-2 mb-1 max-w-full"
              style={{ animation: 'hero-text-in 0.45s ease-out 0.15s both' }}
            >
              <h2 className="text-white font-serif font-bold text-lg md:text-xl truncate max-w-[80vw]">
                {title || 'Nema podataka'}
              </h2>
              {isPlayingNow && <NowPlayingIndicator />}
            </div>
            <p
              className="text-white/70 text-sm md:text-base truncate max-w-[80vw] mb-5"
              style={{ animation: 'hero-text-in 0.45s ease-out 0.22s both' }}
            >
              {subtitle}
            </p>

            <div
              className="flex items-center gap-4 md:gap-6"
              style={{ animation: 'hero-text-in 0.45s ease-out 0.3s both' }}
            >
              <button
                onClick={() => (volume > 0 ? setVolume(0) : setVolume(0.7))}
                className="text-white/70 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 md:w-28 h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-infinity-green-500"
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
                <button onClick={skipSong} className="text-white/70 hover:text-white transition-colors" title="Preskoči pesmu">
                  <SkipForward size={22} />
                </button>
              ) : (
                <div className="w-[22px]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
