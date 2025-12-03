import React, { useEffect, useState } from 'react';

interface TrialConfettiProps {
    duration?: number;
}

const TrialConfetti: React.FC<TrialConfettiProps> = ({ duration = 5000 }) => {
    const [confettiPieces, setConfettiPieces] = useState<Array<{
        id: number;
        left: number;
        animationDelay: number;
        color: string;
    }>>([]);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'];
        const pieces = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            animationDelay: Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        setConfettiPieces(pieces);

        const timer = setTimeout(() => {
            setIsActive(false);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    if (!isActive) return null;

    return (
        <div className="confetti-container">
            {confettiPieces.map((piece) => (
                <div
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                        left: `${piece.left}%`,
                        animationDelay: `${piece.animationDelay}s`,
                        backgroundColor: piece.color,
                    }}
                />
            ))}
            <style>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          opacity: 0;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
};

export default TrialConfetti;
