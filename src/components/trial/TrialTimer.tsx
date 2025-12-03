import React, { useEffect, useState } from 'react';
import { Clock, Zap } from 'lucide-react';

interface TrialTimerProps {
    trialEndsAt: string;
    onExpired?: () => void;
}

const TrialTimer: React.FC<TrialTimerProps> = ({ trialEndsAt, onExpired }) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const end = new Date(trialEndsAt).getTime();
            const difference = end - now;

            if (difference <= 0) {
                setIsExpired(true);
                if (onExpired) {
                    onExpired();
                }
                return {
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                };
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [trialEndsAt, onExpired]);

    if (isExpired) {
        return (
            <div className="trial-timer expired">
                <div className="timer-icon">
                    <Clock size={24} />
                </div>
                <div className="timer-content">
                    <p className="timer-title">Probni period je istekao</p>
                    <p className="timer-subtitle">Pretplatite se da nastavite sa korišćenjem</p>
                </div>
            </div>
        );
    }

    return (
        <div className="trial-timer">
            <div className="timer-header">
                <Zap size={20} className="timer-icon-small" />
                <span className="timer-label">Probni period ističe za:</span>
            </div>
            <div className="timer-display">
                <div className="timer-unit">
                    <div className="timer-value">{timeLeft.days}</div>
                    <div className="timer-unit-label">dana</div>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-unit">
                    <div className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="timer-unit-label">sati</div>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-unit">
                    <div className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="timer-unit-label">min</div>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-unit">
                    <div className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
                    <div className="timer-unit-label">sek</div>
                </div>
            </div>
            <style>{`
        .trial-timer {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin: 20px 0;
          backdrop-filter: blur(10px);
        }

        .trial-timer.expired {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
          border-color: rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .timer-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #6366f1;
        }

        .timer-icon-small {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .timer-label {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .timer-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .timer-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .timer-value {
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          min-width: 50px;
          text-align: center;
        }

        .timer-unit-label {
          font-size: 12px;
          color: #9ca3af;
          text-transform: uppercase;
          font-weight: 600;
        }

        .timer-separator {
          font-size: 28px;
          font-weight: 700;
          color: #6366f1;
          margin: 0 4px;
        }

        .timer-icon {
          color: #ef4444;
        }

        .timer-content {
          flex: 1;
        }

        .timer-title {
          font-size: 18px;
          font-weight: 700;
          color: #ef4444;
          margin: 0 0 4px 0;
        }

        .timer-subtitle {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }

        @media (max-width: 640px) {
          .timer-value {
            font-size: 24px;
            min-width: 40px;
          }

          .timer-separator {
            font-size: 20px;
          }

          .timer-unit-label {
            font-size: 10px;
          }
        }
      `}</style>
        </div>
    );
};

export default TrialTimer;
