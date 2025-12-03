import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface TrialCountdownProps {
  trialEndsAt: string;
  onTrialExpired?: () => void;
}

export default function TrialCountdown({ trialEndsAt, onTrialExpired }: TrialCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
    totalSeconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, totalSeconds: 0 });

  const TRIAL_DURATION = 7 * 24 * 60 * 60;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endDate = new Date(trialEndsAt).getTime();
      const difference = endDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, totalSeconds: 0 });
        if (onTrialExpired) {
          onTrialExpired();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const totalSeconds = Math.floor(difference / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false, totalSeconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [trialEndsAt, onTrialExpired]);

  if (timeLeft.expired) {
    return (
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-4 md:p-6 text-white shadow-lg animate-pulse">
        <div className="flex items-center space-x-3">
          <AlertCircle size={32} className="flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Probni period je istekao</h3>
            <p className="text-sm opacity-90">
              Pretplatite se da nastavite sa korišćenjem servisa
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = ((TRIAL_DURATION - timeLeft.totalSeconds) / TRIAL_DURATION) * 100;
  const remainingPercentage = 100 - progressPercentage;

  let colorScheme = {
    from: 'from-infinity-green-500',
    to: 'to-emerald-600',
    progress: 'bg-infinity-green-600',
    pulse: false
  };

  if (timeLeft.days <= 3 && timeLeft.days > 1) {
    colorScheme = {
      from: 'from-yellow-500',
      to: 'to-orange-500',
      progress: 'bg-yellow-600',
      pulse: false
    };
  } else if (timeLeft.days <= 1) {
    colorScheme = {
      from: 'from-orange-500',
      to: 'to-red-600',
      progress: 'bg-red-600',
      pulse: true
    };
  }

  return (
    <div className={`rounded-2xl p-4 md:p-6 shadow-lg transition-all duration-500 ${
      colorScheme.pulse ? 'animate-pulse' : ''
    } bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} text-white`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Clock size={24} className="flex-shrink-0" />
          <h3 className="text-base md:text-lg font-bold">
            {timeLeft.days === 0 ? 'Probni period uskoro ističe!' : 'Besplatni probni period'}
          </h3>
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${colorScheme.progress} transition-all duration-1000 ease-linear rounded-full`}
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
        <p className="text-xs opacity-75 mt-2 text-center">
          {remainingPercentage.toFixed(1)}% preostalo
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-3">
        <div className="text-center bg-white/20 backdrop-blur rounded-xl p-2 md:p-3 transform hover:scale-105 transition-transform">
          <div className="text-2xl md:text-3xl font-bold tabular-nums flip-animation">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-xs opacity-90 mt-1">Dana</div>
        </div>
        <div className="text-center bg-white/20 backdrop-blur rounded-xl p-2 md:p-3 transform hover:scale-105 transition-transform">
          <div className="text-2xl md:text-3xl font-bold tabular-nums flip-animation">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs opacity-90 mt-1">Sati</div>
        </div>
        <div className="text-center bg-white/20 backdrop-blur rounded-xl p-2 md:p-3 transform hover:scale-105 transition-transform">
          <div className="text-2xl md:text-3xl font-bold tabular-nums flip-animation">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs opacity-90 mt-1">Minuta</div>
        </div>
        <div className="text-center bg-white/20 backdrop-blur rounded-xl p-2 md:p-3 transform hover:scale-105 transition-transform">
          <div className="text-2xl md:text-3xl font-bold tabular-nums flip-animation">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs opacity-90 mt-1">Sekundi</div>
        </div>
      </div>

      <p className="text-xs md:text-sm opacity-90 mt-4 text-center">
        {timeLeft.days === 0
          ? 'Preplatite se sada da ne izgubite pristup!'
          : `Probni period ističe ${new Date(trialEndsAt).toLocaleDateString('sr-RS', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`
        }
      </p>

      <style>{`
        @keyframes flip {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        .flip-animation {
          animation: flip 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
