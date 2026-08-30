import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';

export default function TrialStatus() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [_canCancelTrial, setCanCancelTrial] = useState(false);

    useEffect(() => {
        if (!user || !profile) return;

        // Admin users don't have trial status
        if (profile.is_admin) {
            setIsTrialActive(false);
            return;
        }

        // Check if user is in trial period (relaxed check)
        const isTrial = profile.subscription_status === 'trial';

        // Ensure we preserve the valid date check for logic, but show UI if status is trial
        const hasValidDate = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();

        setIsTrialActive(isTrial);
        // Only allow cancel if we have a valid future date AND not already cancelled
        setCanCancelTrial(isTrial && !!hasValidDate && !profile.cancel_at_period_end);

        if (isTrial && profile.trial_ends_at) {
            updateTimeRemaining(profile.trial_ends_at);
            const interval = setInterval(() => {
                updateTimeRemaining(profile.trial_ends_at!);
            }, 1000);

            return () => clearInterval(interval);
        } else if (isTrial) {
            // Fallback if date is missing
            setTimeRemaining('7 dana');
        }
    }, [user, profile]);

    const updateTimeRemaining = (endsAt: string) => {
        const now = new Date().getTime();
        const end = new Date(endsAt).getTime();
        const diff = end - now;

        if (diff <= 0) {
            // Trial expired — hide this component; UserDashboard handles the expired screen
            setIsTrialActive(false);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    if (!isTrialActive) return null;

    return (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Clock className="text-white" size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Probni Period Aktivan
                            </h3>
                            <span className="text-md font-bold text-purple-600 dark:text-purple-400 font-mono bg-white dark:bg-infinity-dark-800 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-700">
                                {timeRemaining}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Uživajte u svim funkcijama besplatno.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/pretplata')}
                    className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-5 py-2.5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                    Plati odmah
                    <ArrowRight size={16} />
                </button>
            </div>
        </Card>
    );
}
