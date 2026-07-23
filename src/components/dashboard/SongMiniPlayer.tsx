import { X, Clock, Music, Radio } from 'lucide-react';
import { useSongPlayer } from '../../contexts/SongPlayerContext';

export default function SongMiniPlayer() {
  const { songState, currentSong, songQueue, postRadioQueue, stopSong } = useSongPlayer();

  const hasContent = songState !== 'idle' && (currentSong || songQueue.length > 0 || postRadioQueue.length > 0);
  if (!hasContent) return null;

  const isQueued = songState === 'queued';
  const isLoading = songState === 'loading';
  const song = currentSong ?? songQueue[0];
  if (!song) return null;

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-violet-700/40 bg-gradient-to-r from-violet-950 to-purple-900">
      {/* Current / waiting song */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="relative flex-shrink-0">
          <img
            src={song.artwork}
            alt={song.title}
            className="w-10 h-10 rounded-lg object-cover shadow-md"
            style={{ animation: !isQueued && !isLoading ? 'vinyl-spin 8s linear infinite' : 'none' }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isQueued ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Clock size={10} className="text-violet-300 flex-shrink-0" />
                <span className="text-[10px] text-violet-300 font-medium uppercase tracking-wide">Čeka na kraj pesme</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{song.title}</p>
              <p className="text-xs text-violet-300 truncate">{song.artist}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isLoading
                  ? <span className="text-[10px] text-amber-300 font-medium uppercase tracking-wide">Učitavanje...</span>
                  : <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" /><span className="text-[10px] text-green-400 font-medium uppercase tracking-wide">Pušta se</span></>
                }
              </div>
              <p className="text-sm font-bold text-white truncate">{song.title}</p>
              <p className="text-xs text-violet-300 truncate">{song.artist}</p>
            </>
          )}
        </div>

        <button
          onClick={stopSong}
          className="flex-shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          title="Zaustavi sve"
        >
          <X size={14} />
        </button>
      </div>

      {/* Queue list */}
      {(songQueue.length > 0 || postRadioQueue.length > 0) && (
        <div className="border-t border-violet-700/40">
          {songQueue.map((q, i) => (
            <div key={`q-${i}`} className="flex items-center gap-2.5 px-3 py-2 border-b border-violet-800/30 last:border-0">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-violet-800/60 flex-shrink-0">
                <Music size={10} className="text-violet-300" />
              </div>
              <img src={q.artwork} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0 opacity-80" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white/80 truncate">{q.title}</p>
                <p className="text-[10px] text-violet-400 truncate">{q.artist}</p>
              </div>
              <Clock size={10} className="text-violet-500 flex-shrink-0" />
            </div>
          ))}
          {postRadioQueue.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-900/40">
                <Radio size={9} className="text-violet-400 flex-shrink-0" />
                <span className="text-[9px] text-violet-400 font-semibold uppercase tracking-wider">Posle radio pauze</span>
              </div>
              {postRadioQueue.map((q, i) => (
                <div key={`pq-${i}`} className="flex items-center gap-2.5 px-3 py-2 border-b border-violet-800/30 last:border-0">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-800/60 flex-shrink-0">
                    <Music size={10} className="text-indigo-300" />
                  </div>
                  <img src={q.artwork} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/60 truncate">{q.title}</p>
                    <p className="text-[10px] text-indigo-400 truncate">{q.artist}</p>
                  </div>
                  <Clock size={10} className="text-indigo-500 flex-shrink-0" />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
