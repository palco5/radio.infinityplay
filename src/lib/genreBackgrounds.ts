export interface GenreStyle {
  gradient: string;
  pattern?: string;
  overlay?: string;
}

export const genreBackgrounds: Record<string, GenreStyle> = {
  Pop: {
    gradient: 'from-pink-500 via-rose-500 to-purple-500',
    pattern: 'bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]',
  },
  Rock: {
    gradient: 'from-red-600 via-orange-600 to-amber-600',
    pattern: 'bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%)] bg-[length:20px_20px]',
  },
  Jazz: {
    gradient: 'from-amber-700 via-orange-800 to-amber-900',
    pattern: 'bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15)_0%,transparent_60%)]',
  },
  Electronic: {
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    pattern: 'bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_76%,transparent_77%)] bg-[length:50px_50px]',
  },
  Chill: {
    gradient: 'from-green-400 via-emerald-500 to-teal-500',
    pattern: 'bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)]',
  },
  'Hip Hop': {
    gradient: 'from-purple-600 via-violet-600 to-fuchsia-600',
    pattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]',
  },
  Classical: {
    gradient: 'from-slate-600 via-gray-700 to-slate-800',
    pattern: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)]',
  },
  Country: {
    gradient: 'from-yellow-600 via-amber-700 to-orange-700',
    pattern: 'bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.1)_50%,transparent_51%)] bg-[length:30px_30px]',
  },
  Reggae: {
    gradient: 'from-yellow-500 via-lime-500 to-green-600',
    pattern: 'bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.1)_0px,transparent_2px,transparent_5px,rgba(255,255,255,0.1)_7px)]',
  },
  Metal: {
    gradient: 'from-gray-800 via-slate-900 to-black',
    pattern: 'bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.15)_0%,transparent_40%)]',
  },
  Blues: {
    gradient: 'from-blue-800 via-indigo-900 to-blue-950',
    pattern: 'bg-[linear-gradient(135deg,transparent_25%,rgba(255,255,255,0.08)_25%,rgba(255,255,255,0.08)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:40px_40px]',
  },
  'R&B': {
    gradient: 'from-rose-600 via-pink-700 to-purple-800',
    pattern: 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.1)_0%,transparent_50%)]',
  },
  Dance: {
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    pattern: 'bg-[repeating-radial-gradient(circle_at_50%_50%,transparent_0,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]',
  },
  Indie: {
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    pattern: 'bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:30px_30px]',
  },
  Folk: {
    gradient: 'from-amber-600 via-yellow-700 to-orange-800',
    pattern: 'bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.12)_0%,transparent_50%)]',
  },
  Latin: {
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
    pattern: 'bg-[repeating-linear-gradient(90deg,transparent,transparent_15px,rgba(255,255,255,0.1)_15px,rgba(255,255,255,0.1)_30px)]',
  },
  Alternative: {
    gradient: 'from-emerald-600 via-teal-700 to-cyan-800',
    pattern: 'bg-[linear-gradient(135deg,transparent_30%,rgba(255,255,255,0.1)_30%,rgba(255,255,255,0.1)_70%,transparent_70%)] bg-[length:25px_25px]',
  },
  Soul: {
    gradient: 'from-purple-700 via-indigo-800 to-violet-900',
    pattern: 'bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1)_0%,transparent_60%)]',
  },
  Funk: {
    gradient: 'from-orange-500 via-red-600 to-pink-600',
    pattern: 'bg-[repeating-conic-gradient(from_0deg,transparent_0deg_30deg,rgba(255,255,255,0.1)_30deg_60deg)]',
  },
  default: {
    gradient: 'from-infinity-green-400 to-infinity-green-600',
    pattern: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]',
  },
};

export function getGenreStyle(genre: string): GenreStyle {
  return genreBackgrounds[genre] || genreBackgrounds.default;
}
