import { Clock, Music, Radio } from 'lucide-react';
import { useSongPlayer } from '../../contexts/SongPlayerContext';

// Now-playing display lives in HeroPlayer — this just shows the upcoming queue.
export default function SongMiniPlayer() {
  const { songQueue, postRadioQueue } = useSongPlayer();

  if (songQueue.length === 0 && postRadioQueue.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-violet-700/40 bg-gradient-to-r from-violet-950 to-purple-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-700/40">
        <Music size={12} className="text-violet-300" />
        <span className="text-[10px] text-violet-300 font-semibold uppercase tracking-wide">Red čekanja</span>
      </div>
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
  );
}
