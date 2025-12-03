import { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function TrialStatus() {
    const { user } = useAuth();
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [canCancelTrial, setCanCancelTrial] = useState(false);

    useEffect(() => {
        if (!user) return;

        const profile = localAuth.getProfile(user.id);
        if (!profile) return;

        // Admin users don't have trial status
        if (profile.is_admin) {
            setIsTrialActive(false);
            return;
        }

        // Check if user is in trial period
        const isTrial = profile.subscription_status === 'trial' &&
            profile.trial_ends_at &&
            new Date(profile.trial_ends_at) > new Date();

        setIsTrialActive(!!isTrial);
        setTrialEndsAt(profile.trial_ends_at || null);
        setCanCancelTrial(!!isTrial && !profile.cancel_at_period_end);

        if (isTrial && profile.trial_ends_at) {
            updateTimeRemaining(profile.trial_ends_at);
            const interval = setInterval(() => {
                updateTimeRemaining(profile.trial_ends_at!);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [user]);

    const updateTimeRemaining = (endsAt: string) => {
        const now = new Date().getTime();
        const end = new Date(endsAt).getTime();
        const diff = end - now;

        if (diff <= 0) {
            setTimeRemaining('Probni period je istekao');
            setIsTrialActive(false);
            handleTrialExpired();
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    const handleTrialExpired = () => {
        if (!user) return;

        const profile = localAuth.getProfile(user.id);
        if (!profile) return;

        if (!profile.cancel_at_period_end) {
            // Auto-charge and convert to paid subscription
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

            localAuth.updateProfile(user.id, {
                subscription_status: 'active',
                subscription_ends_at: subscriptionEndsAt.toISOString(),
                trial_ends_at: null,
            });

            alert('Vaš probni period je istekao. Pretplata je automatski aktivirana na 30 dana. Plaćanje će biti izvršeno putem PayPal-a.');
            window.location.reload();
        } else {
            // Trial expired and user cancelled
            localAuth.updateProfile(user.id, {
                subscription_status: 'inactive',
                subscription_tier: 'free',
                trial_ends_at: null,
                cancel_at_period_end: false,
            });

            alert('Vaš probni period je istekao. Pretplatite se ponovo da nastavite.');
            window.location.reload();
        }
    };

    const handleCancelTrial = () => {
        if (!user) return;

        if (!confirm('Da li ste sigurni da želite da otkažete pretplatu? Moći ćete da koristite sve funkcije do isteka probnog perioda, ali vam neće biti naplaćeno.')) {
            return;
        }

        localAuth.updateProfile(user.id, {
            cancel_at_period_end: true,
        });

        setCanCancelTrial(false);
        alert('Pretplata je otkazana. Možete nastaviti da koristite sve funkcije do isteka probnog perioda.');
    };

    if (!isTrialActive) return null;

    return (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <Clock className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Probni Period Aktivan
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                7-dnevni besplatni probni period
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-infinity-dark-800 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Preostalo vreme:
                            </span>
                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                                {timeRemaining}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                                style={{
                                    width: trialEndsAt
                                        ? `${Math.max(0, Math.min(100, ((new Date(trialEndsAt).getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) * 100))}%`
                                        : '0%'
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle size={16} className="text-green-500" />
                            <span>Sve funkcije dostupne tokom probnog perioda</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                            {canCancelTrial ? (
                                <>
                                    <AlertCircle size={16} className="text-yellow-500" />
                                    <span>Automatsko plaćanje nakon isteka probnog perioda</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={16} className="text-red-500" />
                                    <span>Pretplata otkazana - neće biti naplaćeno</span>
                                </>
                            )}
                        </div>
                    </div>

                    {canCancelTrial && (
                        <Button
                            variant="ghost"
                            onClick={handleCancelTrial}
                            className="w-full border-2 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                            <XCircle size={18} className="mr-2" />
                            Otkaži Pretplatu
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
