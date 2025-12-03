import { Volume2, VolumeX, Play, Pause, Radio, Minimize2 } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import Button from '../ui/Button';
import NowPlayingIndicator from './NowPlayingIndicator';

export default function AudioPlayer() {
  const { currentStation, isPlaying, volume, pause, playStation, setVolume, playJingle } = useAudio();
  const [isMinimized, setIsMinimized] = useState(false);
  const { user } = useAuth();
  const lastJingleTimeRef = useRef<number>(Date.now());
  const jingleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Jingle Logic
  useEffect(() => {
    if (!user || !isPlaying || !currentStation) {
      if (jingleIntervalRef.current) {
        clearInterval(jingleIntervalRef.current);
        jingleIntervalRef.current = null;
      }
      return;
    }

    const profile = localAuth.getProfile(user.id);
    if (!profile?.jingle_url) return;

    const intervalMinutes = profile.jingle_interval_minutes || 7;
    const intervalMs = intervalMinutes * 60 * 1000;

    jingleIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastJingleTimeRef.current >= intervalMs) {
        playJingle(profile.jingle_url!);
        lastJingleTimeRef.current = now;
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (jingleIntervalRef.current) {
        clearInterval(jingleIntervalRef.current);
      }
    };
  }, [user, isPlaying, currentStation, playJingle]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(0.7);
    }
  };

  if (!currentStation) return null;

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-infinity-dark-900/95 backdrop-blur-lg border-t-2 border-infinity-green-500 shadow-2xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-infinity rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-green">
              <Radio className="text-white" size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-lg font-serif font-bold text-gray-900 dark:text-white truncate">
                  {currentStation.name}
                </h4>
                <NowPlayingIndicator />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {currentStation.genre}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => (isPlaying ? pause() : playStation(currentStation))}
              className="w-14 h-14 bg-gradient-infinity rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              {isPlaying ? (
                <Pause className="text-white" size={24} />
              ) : (
                <Play className="text-white ml-1" size={24} />
              )}
            </button>

            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors"
              >
                {volume === 0 ? (
                  <VolumeX className="text-gray-600 dark:text-gray-400" size={20} />
                ) : (
                  <Volume2 className="text-infinity-green-600" size={20} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-200 dark:bg-infinity-dark-700 rounded-lg appearance-none cursor-pointer accent-infinity-green-600"
              />

              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors"
              >
                <Minimize2 className="text-gray-600 dark:text-gray-400" size={20} />
              </button>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 size={20} />
              </Button>
            </div>
          </div>
        </div>

        <div className="md:hidden mt-3 flex items-center justify-center space-x-3">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-full transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="text-gray-600 dark:text-gray-400" size={20} />
            ) : (
              <Volume2 className="text-infinity-green-600" size={20} />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-200 dark:bg-infinity-dark-700 rounded-lg appearance-none cursor-pointer accent-infinity-green-600"
          />
        </div>
      </div>
    </div>
  );
}
