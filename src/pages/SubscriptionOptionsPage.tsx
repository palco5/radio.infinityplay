import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profiles as profilesApi } from '../lib/api';
import { Check, CreditCard, Clock, Building2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const pricingPlans = [
    {
        id: 'basic-radio',
        name: 'BASIC RADIO',
        price: 15,
        currency: '€',
        priceRsd: 1770,
        interval: 'mesečno',
        recommended: true,
        features: [
            'Pristup svim stanicama',
            'Bez reklama',
            'Visok kvalitet zvuka',
            'Podrška putem emaila',
            '7 dana probni period'
        ]
    },
    {
        id: 'branded-radio',
        name: 'BRANDED RADIO',
        price: 35,
        currency: '€',
        priceRsd: 4130,
        interval: 'mesečno',
        features: [
            'Sve iz Basic paketa',
            'Brendirani džinglovi',
            'Prioritetna podrška',
            'Personalizovani stream'
        ]
    },
    {
        id: 'host-radio',
        name: 'HOST RADIO',
        price: 195,
        currency: '€',
        priceRsd: 23000,
        interval: 'godišnje',
        features: [
            'Sve iz Branded paketa',
            'Admin panel',
            'Kreiranje stanica',
            'Profesionalni hosting'
        ]
    },
];

type Country = 'serbia' | 'other';

export default function SubscriptionOptionsPage() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [selectedPlanId, setSelectedPlanId] = useState<string>('basic-radio');
    const [selectedCountry, setSelectedCountry] = useState<Country>('serbia');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const selectedPlan = pricingPlans.find(p => p.id === selectedPlanId) || pricingPlans[0];

    const trialAlreadyUsed = !!profile?.trial_started_at;

    const handleStartTrial = async () => {
        if (!selectedPlan || !user || trialAlreadyUsed) return;
        setProcessing(true);
        try {
            const updates: any = {
                subscription_status: 'trial',
                subscription_tier: 'basic-radio',
                trial_started_at: new Date().toISOString(),
                trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            };

            await profilesApi.update(user.id, updates);
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error('Trial activation error:', error);
            alert('Greška pri aktivaciji probnog perioda.');
        } finally {
            setProcessing(false);
        }
    };

    const renderPaymentInstructions = () => {
        if (selectedCountry === 'other') {
            return (
                <div className="bg-gray-50 dark:bg-gray-900/20 border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center mt-6">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="text-gray-400" size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Uskoro dostupno
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Plaćanje za zemlje van Srbije biće omogućeno uskoro.
                        Trenutno je moguće plaćanje samo za korisnike iz Srbije putem bankovnog transfera.
                    </p>

                    <div className="bg-white dark:bg-infinity-dark-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 inline-block text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Kontakt za informacije:</p>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p>Email: <a href="mailto:info@infinityplay.rs" className="text-infinity-green-600 hover:underline">info@infinityplay.rs</a></p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 mt-6">
                <div className="flex items-center mb-4">
                    <Building2 className="text-blue-600 mr-3" size={32} />
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Bankovski Transfer (Srbija)</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Instrukcije za uplatu:</p>
                    </div>
                </div>

                <div className="space-y-4 bg-white dark:bg-infinity-dark-800 rounded-xl p-5 border border-blue-100 dark:border-blue-900">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Uplatilac</p>
                        <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                            {profile?.first_name || 'Vaše ime'}, {profile?.last_name || 'prezime'} ili naziv firme i mesto
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Svrha uplate</p>
                        <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 break-all">
                            Pretplata za {selectedPlan.name}, {user?.email}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Primalac</p>
                        <p className="font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                            Bitrejt d.o.o. Beograd
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Račun</p>
                            <p className="font-mono font-bold text-gray-900 dark:text-white text-lg break-all">
                                205-0000000357135-48
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Model</p>
                            <p className="font-mono font-bold text-gray-900 dark:text-white break-words">
                                (ostaviti prazno)
                            </p>
                        </div>
                    </div>

                    <div className="mt-2 text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Iznos za uplatu</p>
                        <div className="flex items-end justify-end">
                            <p className="font-bold text-gray-400 dark:text-gray-500 text-lg mr-2 line-through">
                                {selectedPlan.price} {selectedPlan.currency}
                            </p>
                            <p className="font-mono font-bold text-infinity-green-600 text-3xl">
                                {(selectedPlan.price * 117.5).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-start p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <AlertCircle className="text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" size={20} />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <strong>Napomena:</strong> Aktivacija naloga se vrši nakon evidentirane uplate (obično u roku od 24h).
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 py-12 px-4 sm:px-6 lg:px-8 pt-32 transition-colors duration-200">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl font-serif">
                        Odaberite Vaš Paket
                    </h1>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
                        Fleksibilne opcije za svakoga.
                    </p>
                </div>

                {/* Trial Hero Button */}
                <div className="flex justify-center">
                    {trialAlreadyUsed ? (
                        <div className="flex items-center gap-3 px-6 py-4 bg-gray-100 dark:bg-infinity-dark-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 text-sm font-medium">
                            <AlertCircle size={20} className="flex-shrink-0" />
                            Probni period je već iskorišćen za ovaj nalog
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            className="bg-gradient-to-r from-infinity-green-500 to-emerald-600 hover:from-infinity-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all shadow-lg text-lg px-8 py-4"
                            onClick={handleStartTrial}
                            disabled={processing}
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Clock className="mr-2" size={24} />
                                    Probaj 7 Dana Besplatno
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <Card className="p-6 md:p-8">
                    {/* Custom Tab Slider for Plans */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                            Izaberite Paket
                        </label>
                        <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2">
                            {pricingPlans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center ${selectedPlanId === plan.id
                                        ? 'bg-white dark:bg-infinity-dark-700 text-infinity-green-600 shadow-md transform scale-[1.02]'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <span className="mr-2">{plan.name}</span>
                                    {selectedPlanId === plan.id && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Plan Details Preview */}
                    <div className="mb-8 text-center p-6 bg-infinity-green-50 dark:bg-infinity-green-900/10 rounded-2xl border border-infinity-green-100 dark:border-infinity-green-900/30">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {selectedPlan.name}
                        </h2>
                        <div className="flex justify-center items-baseline mb-4">
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                {selectedPlan.price}{selectedPlan.currency}
                            </span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                / {selectedPlan.interval}
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {selectedPlan.features.map((feature, i) => (
                                <span key={i} className="bg-white dark:bg-infinity-dark-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Country Toggle */}
                    <div className="flex justify-center mb-6">
                        <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            <button
                                onClick={() => setSelectedCountry('serbia')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCountry === 'serbia'
                                    ? 'bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                Srbija
                            </button>
                            <button
                                onClick={() => setSelectedCountry('other')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCountry === 'other'
                                    ? 'bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                Ostale Zemlje
                            </button>
                        </div>
                    </div>

                    {/* Payment Instructions */}
                    {renderPaymentInstructions()}
                </Card>
            </div>
        </div>
    );
}
