import AuthForm from './AuthForm';
import { Radio } from 'lucide-react';

export default function PWAAuthView() {
    return (
        <div className="min-h-screen bg-white dark:bg-infinity-dark-900 flex flex-col items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-infinity-green-500/10 mb-6">
                        <Radio className="w-10 h-10 text-infinity-green-500" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                        InfinityPlay
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Dobrodošli nazad! Prijavite se na svoj radio.
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-infinity-dark-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-infinity-dark-700">
                    <AuthForm />
                </div>
            </div>
        </div>
    );
}
