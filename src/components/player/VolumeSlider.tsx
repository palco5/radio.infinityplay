import { useRef } from 'react';

interface VolumeSliderProps {
  value: number;                    // 0..1
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;   // fires on release (pointer up / cancel)
  className?: string;
}

// Custom pointer-driven slider — native <input type="range"> with appearance-none
// has an invisible, ~6px-tall thumb on mobile browsers which makes it impossible
// to drag by touch. This one captures the pointer and offers a tall hit area.
export default function VolumeSlider({ value, onChange, onCommit, className = 'w-24' }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const ratioAt = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(ratioAt(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(ratioAt(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    onCommit?.(ratioAt(e.clientX));
  };

  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div
      className={`relative flex items-center py-3 cursor-pointer select-none ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label="Jačina zvuka"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div ref={trackRef} className="relative w-full h-1.5 rounded-full bg-white/25">
        <div className="absolute inset-y-0 left-0 rounded-full bg-infinity-green-500" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
