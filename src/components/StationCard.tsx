import { Play, Pause, Music } from 'lucide-react';
import { RadioStation } from '../types';
import { getGenreStyle } from '../lib/genreBackgrounds';

interface StationCardProps {
    station: RadioStation;
    isCurrentlyPlaying: boolean;
    onClick: (station: RadioStation) => void;
    className?: string;
    variant?: 'default' | 'compact';
}

export default function StationCard({
    station,
    isCurrentlyPlaying,
    onClick,
    className = '',
    variant = 'default'
}: StationCardProps) {
    const isCompact = variant === 'compact';

    return (
        <div
            onClick={() => onClick(station)}
            className={`${isCompact ? 'p-2 rounded-xl' : 'p-4 rounded-2xl'} border-2 cursor-pointer transition-all ${isCurrentlyPlaying
                ? 'border-infinity-green-500 bg-infinity-green-50 dark:bg-infinity-green-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-infinity-green-300 dark:hover:border-infinity-green-700'
                } ${className}`}
        >
            <div className={`flex items-center justify-between ${isCompact ? 'mb-1' : 'mb-3'}`}>
                <div className={`${isCompact ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-xl'} flex items-center justify-center relative overflow-hidden`}>
                    {station.background_color ? (
                        <div className="absolute inset-0" style={{ backgroundColor: station.background_color }}></div>
                    ) : (
                        <>
                            <div className={`absolute inset-0 bg-gradient-to-br ${getGenreStyle(station.genre).gradient}`}></div>
                            <div className={`absolute inset-0 ${getGenreStyle(station.genre).pattern}`}></div>
                        </>
                    )}
                    <Music className="text-white relative z-10" size={isCompact ? 16 : 24} />
                </div>
                <button className={`${isCompact ? 'w-6 h-6' : 'w-10 h-10'} rounded-full flex items-center justify-center ${isCurrentlyPlaying
                    ? 'bg-infinity-green-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                    {isCurrentlyPlaying ? (
                        <Pause className="text-white" size={isCompact ? 12 : 20} />
                    ) : (
                        <Play className="text-gray-700 dark:text-gray-300" size={isCompact ? 12 : 20} />
                    )}
                </button>
            </div>
            <h3 className={`${isCompact ? 'text-xs' : 'text-base'} font-bold text-gray-900 dark:text-white mb-0.5 truncate`}>
                {station.name}
            </h3>
            <p className={`${isCompact ? 'text-[10px]' : 'text-sm'} text-gray-600 dark:text-gray-400 truncate`}>
                {station.genre}
            </p>

            {!isCompact && station.description && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                    {station.description}
                </p>
            )}

            {!isCompact && station.recommended_for && station.recommended_for.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {station.recommended_for.slice(0, 3).map((type) => (
                        <span
                            key={type}
                            className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full"
                        >
                            {type}
                        </span>
                    ))}
                    {station.recommended_for.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                            +{station.recommended_for.length - 3}
                        </span>
                    )}
                </div>
            )}

            {isCurrentlyPlaying && (
                <div className="mt-2 flex items-center space-x-1">
                    <div className="w-1 h-3 bg-infinity-green-600 rounded-full animate-pulse"></div>
                    <div className="w-1 h-4 bg-infinity-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-3 bg-infinity-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    {!isCompact && <span className="text-xs text-infinity-green-600 ml-2">Svira</span>}
                </div>
            )}
        </div>
    );
}
