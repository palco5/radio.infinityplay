import { Play, Pause } from 'lucide-react';

interface MojRadioCardProps {
    isPlaying: boolean;
    onClick: () => void;
    displayName?: string;
}

const EQ_HEIGHTS = [4, 7, 5, 9, 6, 8, 4, 7, 5];

export default function MojRadioCard({ isPlaying, onClick, displayName }: MojRadioCardProps) {
    return (
        <div
            onClick={onClick}
            className="relative cursor-pointer rounded-2xl overflow-hidden mb-6 w-full select-none group"
            style={{
                background: 'linear-gradient(135deg, #0d1117 0%, #161b22 55%, #1a2332 100%)',
                border: '1px solid rgba(16,185,129,0.22)',
                boxShadow: isPlaying
                    ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.18), 0 0 24px rgba(16,185,129,0.08)'
                    : '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.08)',
                transition: 'box-shadow 0.4s ease',
            }}
        >
            {/* Subtle green left glow when playing */}
            {isPlaying && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 12% 50%, rgba(16,185,129,0.11) 0%, transparent 60%)',
                    }}
                />
            )}

            <div className="relative flex items-center gap-4 sm:gap-6 px-4 py-4 sm:px-6 sm:py-5">

                {/* ── Vinyl Record + Soundwave Rings ── */}
                <div className="flex-shrink-0 relative" style={{ width: '5rem', height: '5rem' }}>

                    {/* Pulsing soundwave rings (behind disc) */}
                    {isPlaying && (<>
                        <div className="absolute inset-0 rounded-full" style={{ animation: 'sound-ring 2s ease-out infinite', border: '1.5px solid rgba(16,185,129,0.45)', animationDelay: '0s' }} />
                        <div className="absolute inset-0 rounded-full" style={{ animation: 'sound-ring 2s ease-out infinite', border: '1.5px solid rgba(16,185,129,0.3)', animationDelay: '0.65s' }} />
                        <div className="absolute inset-0 rounded-full" style={{ animation: 'sound-ring 2s ease-out infinite', border: '1.5px solid rgba(16,185,129,0.18)', animationDelay: '1.3s' }} />
                    </>)}

                    {/* Disc */}
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            animation: isPlaying ? 'vinyl-spin 2.4s linear infinite' : 'none',
                            background: `
                                radial-gradient(circle at 50% 50%,
                                    #10b981 0%,   #10b981 17%,
                                    #0a0a0a 18%,  #0a0a0a 22%,
                                    #3a3a3a 23%,  #3a3a3a 25.5%,
                                    #0f0f0f 26%,  #0f0f0f 30%,
                                    #383838 31%,  #383838 33%,
                                    #0f0f0f 34%,  #0f0f0f 38%,
                                    #383838 39%,  #383838 41%,
                                    #0f0f0f 42%,  #0f0f0f 46%,
                                    #383838 47%,  #383838 49%,
                                    #0f0f0f 50%,  #0f0f0f 54%,
                                    #383838 55%,  #383838 57%,
                                    #0f0f0f 58%,  #0f0f0f 100%
                                )
                            `,
                            boxShadow: isPlaying
                                ? '0 0 0 2px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.2), 0 4px 20px rgba(0,0,0,0.7)'
                                : '0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Light sheen on disc */}
                        <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: 'conic-gradient(from 200deg, transparent 0deg, rgba(255,255,255,0.06) 60deg, transparent 120deg)',
                            }}
                        />
                        {/* Center label */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="rounded-full flex items-center justify-center"
                                style={{
                                    width: '34%',
                                    height: '34%',
                                    background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
                                    boxShadow: isPlaying ? '0 0 8px rgba(16,185,129,0.6)' : 'none',
                                }}
                            >
                                {/* Center hole */}
                                <div className="rounded-full" style={{ width: '28%', height: '28%', background: '#0d1117' }} />
                            </div>
                        </div>
                    </div>

                    {/* Tonearm needle (SVG) */}
                    <svg
                        viewBox="0 0 80 80"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ overflow: 'visible' }}
                    >
                        {/* Pivot point at top-right */}
                        <g transform="translate(74, 6)">
                            {/* Pivot circle */}
                            <circle cx="0" cy="0" r="3" fill="#444" stroke="#666" strokeWidth="0.5" />
                            {/* Arm shaft — rotates from pivot */}
                            <g style={{
                                transform: isPlaying ? 'rotate(-28deg)' : 'rotate(-14deg)',
                                transformOrigin: '0 0',
                                transition: 'transform 1.2s cubic-bezier(0.4,0,0.2,1)',
                            }}>
                                <rect x="-1" y="0" width="2" height="48" rx="1" fill="url(#armGrad)" />
                                {/* Head shell */}
                                <rect x="-4" y="44" width="8" height="5" rx="1.5" fill="#555" />
                                {/* Stylus tip */}
                                <circle cx="0" cy="51" r="1.5" fill="#10b981" style={{ filter: isPlaying ? 'drop-shadow(0 0 3px rgba(16,185,129,0.8))' : 'none' }} />
                            </g>
                            <defs>
                                <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#5a5a5a" />
                                    <stop offset="50%" stopColor="#888" />
                                    <stop offset="100%" stopColor="#4a4a4a" />
                                </linearGradient>
                            </defs>
                        </g>
                    </svg>

                    {/* Live ping dot */}
                    {isPlaying && (
                        <span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400"
                            style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)', zIndex: 10 }}
                        >
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        </span>
                    )}
                </div>

                {/* ── Info ── */}
                <div className="flex-1 min-w-0">
                    {/* Badge */}
                    <span
                        className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded mb-1.5"
                        style={{
                            color: '#10b981',
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        Personalni stream
                    </span>

                    <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight truncate">
                        Moj Radio
                    </h2>

                    {displayName && (
                        <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">
                            {displayName}
                        </p>
                    )}

                    {/* Equalizer bars */}
                    <div className="mt-2 flex items-end gap-[3px] h-5" aria-hidden>
                        {EQ_HEIGHTS.map((h, i) => (
                            <div
                                key={i}
                                className="w-[3px] rounded-sm origin-bottom"
                                style={{
                                    height: `${h * 2.2}px`,
                                    background: isPlaying ? '#10b981' : 'rgba(16,185,129,0.2)',
                                    animation: isPlaying
                                        ? `eq-bar ${0.55 + i * 0.09}s ease-in-out infinite`
                                        : 'none',
                                    animationDelay: `${i * 0.06}s`,
                                    opacity: isPlaying ? 0.85 : 0.4,
                                    transition: 'background 0.3s, opacity 0.3s',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Play / Pause button ── */}
                <button
                    className="flex-shrink-0 rounded-full flex items-center justify-center transition-transform duration-150 group-hover:scale-105 active:scale-95"
                    style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: isPlaying
                            ? 'rgba(16,185,129,0.12)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: isPlaying
                            ? '1.5px solid rgba(16,185,129,0.45)'
                            : '1.5px solid transparent',
                        boxShadow: isPlaying
                            ? '0 0 14px rgba(16,185,129,0.18)'
                            : '0 4px 14px rgba(16,185,129,0.35)',
                    }}
                    aria-label={isPlaying ? 'Pauziraj' : 'Pusti'}
                >
                    {isPlaying
                        ? <Pause size={18} style={{ color: '#10b981' }} />
                        : <Play size={18} className="text-white ml-0.5" />
                    }
                </button>
            </div>

            {/* Bottom accent line */}
            <div
                className="h-px w-full"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)',
                    opacity: isPlaying ? 1 : 0.3,
                    transition: 'opacity 0.4s ease',
                }}
            />
        </div>
    );
}
