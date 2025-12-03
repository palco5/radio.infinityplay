import { useEffect, useState } from 'react';
import { useAudio } from '../../contexts/AudioContext';

export default function NowPlayingIndicator() {
    const { isPlaying, currentStation } = useAudio();
    const [bars, setBars] = useState([0, 0, 0, 0]);

    useEffect(() => {
        if (!isPlaying) {
            setBars([0, 0, 0, 0]);
            return;
        }

        const interval = setInterval(() => {
            setBars([
                Math.random() * 100,
                Math.random() * 100,
                Math.random() * 100,
                Math.random() * 100,
            ]);
        }, 150);

        return () => clearInterval(interval);
    }, [isPlaying]);

    if (!currentStation) return null;

    return (
        <div className="flex items-center space-x-1">
            {bars.map((height, index) => (
                <div
                    key={index}
                    className="w-1 bg-gradient-to-t from-infinity-green-500 to-infinity-green-300 rounded-full transition-all duration-150"
                    style={{
                        height: isPlaying ? `${Math.max(20, height)}%` : '20%',
                        maxHeight: '24px',
                    }}
                />
            ))}
        </div>
    );
}
