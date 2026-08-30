import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { X, Ban, Music, User, Search } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { fetchUserBlacklist } from '../../lib/blacklist';
import type { BlacklistEntry } from '../../lib/api';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Filter = 'all' | 'song' | 'artist';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Sve' },
  { key: 'song', label: 'Pesme' },
  { key: 'artist', label: 'Izvođači' },
];

const entryLabel = (e: BlacklistEntry) =>
  e.block_type === 'artist'
    ? e.artist
    : e.artist
      ? `${e.artist} — ${e.title}`
      : (e.title ?? '');

export default function BlacklistModal({ isOpen, onClose }: BlacklistModalProps) {
  const { blacklist, refreshBlacklist } = useAudio();
  const [searchParams] = useSearchParams();
  const adminView = searchParams.get('adminView'); // id korisnika kog admin gleda
  const [adminList, setAdminList] = useState<BlacklistEntry[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Izvor liste: u admin-pregledu = blacklist ciljanog korisnika (read-only),
  // inače sopstvena iz AudioContext-a.
  const list = adminView ? adminList : blacklist;

  // Refresh from the server + reset controls each time the panel opens.
  useEffect(() => {
    if (!isOpen) return;
    setQuery(''); setFilter('all');
    if (adminView) {
      fetchUserBlacklist(adminView).then(setAdminList).catch(() => setAdminList([]));
    } else {
      refreshBlacklist();
    }
  }, [isOpen, adminView, refreshBlacklist]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(e => {
      if (filter !== 'all' && e.block_type !== filter) return false;
      if (!q) return true;
      return entryLabel(e).toLowerCase().includes(q);
    });
  }, [list, query, filter]);

  if (!isOpen) return null;

  const counts = {
    song: list.filter(e => e.block_type === 'song').length,
    artist: list.filter(e => e.block_type === 'artist').length,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-infinity-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'blmodal-in 0.28s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <style>{`@keyframes blmodal-in{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <Ban size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Blacklist</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {list.length === 0 ? 'ništa blokirano' : `${list.length} blokirano`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-5 pt-4 pb-3 space-y-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pretraži pesmu ili izvođača..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-gray-100 dark:bg-infinity-dark-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 transition-shadow"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            {FILTERS.map(f => {
              const active = filter === f.key;
              const count = f.key === 'all' ? list.length : counts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-infinity-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-infinity-dark-600'
                  }`}
                >
                  {f.label}{count > 0 ? ` · ${count}` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Ban size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {list.length === 0 ? 'Blacklist je prazna.' : 'Nema rezultata za pretragu.'}
              </p>
              {list.length === 0 && (
                <p className="text-xs mt-1">Blokiraj pesmu ili izvođača iz plejera.</p>
              )}
            </div>
          ) : (
            filtered.map(e => (
              <BlacklistRow key={e.id} entry={e} text={entryLabel(e)} />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BlacklistRow({ entry, text }: { entry: BlacklistEntry; text: string }) {
  const isArtist = entry.block_type === 'artist';
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-infinity-dark-700/60 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isArtist ? 'bg-violet-500/15 text-violet-500' : 'bg-sky-500/15 text-sky-500'
      }`}>
        {isArtist ? <User size={16} /> : <Music size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 dark:text-gray-100 truncate" title={text}>{text}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{isArtist ? 'Izvođač' : 'Pesma'}</p>
      </div>
    </div>
  );
}
