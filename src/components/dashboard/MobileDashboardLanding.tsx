import { Radio, SlidersHorizontal, Moon, Sun, User, LogOut, Shield, ChevronRight, Settings } from 'lucide-react';

interface MobileDashboardLandingProps {
  displayName?: string | null;
  avatarUrl?: string | null;
  theme: string;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onRadio: () => void;
  onControl: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
}

export default function MobileDashboardLanding({
  displayName,
  avatarUrl,
  theme,
  onToggleTheme,
  onOpenSettings,
  onSignOut,
  onRadio,
  onControl,
  isAdmin,
  onAdmin,
}: MobileDashboardLandingProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-infinity-dark-900">
      {/* Top utility bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <img src="logo.png" alt="InfinityPlay" className="h-8 w-auto" />
        <div className="flex items-center gap-1.5">
          {isAdmin && onAdmin && (
            <button
              onClick={onAdmin}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Admin Panel"
            >
              <Shield size={18} className="text-red-600 dark:text-red-400" />
            </button>
          )}
          <button onClick={onToggleTheme} className="p-2 rounded-full hover:bg-gray-200/70 dark:hover:bg-infinity-dark-700 transition-colors">
            {theme === 'dark' ? <Sun className="text-infinity-green-500" size={20} /> : <Moon className="text-gray-700" size={20} />}
          </button>
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-infinity-dark-700 rounded-full">
            {avatarUrl ? <span className="text-xl">{avatarUrl}</span> : <User size={18} className="text-gray-600 dark:text-gray-400" />}
          </div>
          <button onClick={onSignOut} className="p-2 rounded-full hover:bg-gray-200/70 dark:hover:bg-infinity-dark-700 transition-colors">
            <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 pt-8 pb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">Dobrodošli{displayName ? ',' : ''}</p>
        {displayName && (
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white truncate">{displayName}</h1>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Šta želiš da radiš?</p>
      </div>

      {/* Two choices + settings */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-5 pb-10">
        {/* Radio */}
        <button
          onClick={onRadio}
          className="relative overflow-hidden rounded-3xl p-8 text-left active:scale-[0.98] transition-transform shadow-xl"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 55%, #065f46 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)' }} />
          <div className="relative flex items-center gap-5">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Radio size={36} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">Radio</h2>
              <p className="text-base text-white/80 mt-1">Puštaj stanice na ovom telefonu</p>
            </div>
            <ChevronRight size={26} className="text-white/70 flex-shrink-0" />
          </div>
        </button>

        {/* Kontroliši */}
        <button
          onClick={onControl}
          className="relative overflow-hidden rounded-3xl p-8 text-left active:scale-[0.98] transition-transform shadow-xl"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 55%, #3730a3 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)' }} />
          <div className="relative flex items-center gap-5">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <SlidersHorizontal size={34} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">Kontroliši</h2>
              <p className="text-base text-white/80 mt-1">Upravljaj muzikom u svom lokalu</p>
            </div>
            <ChevronRight size={26} className="text-white/70 flex-shrink-0" />
          </div>
        </button>

        {/* Podešavanja — manje dugme */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-2.5 rounded-2xl py-4 bg-gray-100 dark:bg-infinity-dark-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-infinity-dark-700 active:scale-[0.98] transition-all"
        >
          <Settings size={20} />
          <span className="text-base font-semibold">Podešavanja</span>
        </button>
      </div>
    </div>
  );
}
