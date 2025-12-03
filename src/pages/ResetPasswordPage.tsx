import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { validateResetToken, deleteResetToken } from '../lib/emailService';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [validToken, setValidToken] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (token) {
            const validation = validateResetToken(token);
            if (validation.valid && validation.email) {
                setValidToken(true);
                setEmail(validation.email);
            } else {
                setError('Link za resetovanje je nevažeći ili je istekao.');
            }
        } else {
            setError('Nevažeći link za resetovanje.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Lozinka mora imati najmanje 6 karaktera.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Lozinke se ne poklapaju.');
            return;
        }

        setLoading(true);

        try {
            // Pronađi korisnika po email-u
            const users = JSON.parse(localStorage.getItem('infinity_users') || '[]');
            const userIndex = users.findIndex((u: any) => u.email === email);

            if (userIndex !== -1) {
                // Ažuriraj lozinku
                users[userIndex].password = password;
                localStorage.setItem('infinity_users', JSON.stringify(users));

                // Obriši token
                deleteResetToken(email);

                setSuccess(true);
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setError('Korisnik nije pronađen.');
            }
        } catch (err) {
            setError('Greška pri resetovanju lozinke. Pokušajte ponovo.');
        } finally {
            setLoading(false);
        }
    };

    if (!validToken && !error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-infinity-dark-900 via-infinity-dark-800 to-infinity-dark-900 flex items-center justify-center p-4">
                <div className="w-8 h-8 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-infinity-dark-900 via-infinity-dark-800 to-infinity-dark-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-infinity-dark-800 rounded-3xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                            Resetovanje Lozinke
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Unesite novu lozinku za vaš nalog
                        </p>
                    </div>

                    {error && !validToken ? (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                                <div>
                                    <p className="text-red-700 dark:text-red-400 font-semibold">
                                        Nevažeći Link
                                    </p>
                                    <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/')}
                                className="w-full"
                            >
                                <ArrowLeft size={18} className="mr-2" />
                                Nazad na Početnu
                            </Button>
                        </div>
                    ) : success ? (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Check className="text-green-600" size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Uspešno Resetovano!
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Vaša lozinka je uspešno promenjena.
                                    <br />
                                    Bićete preusmereni na početnu stranicu...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                                    <AlertCircle className="text-red-600" size={20} />
                                    <span className="text-red-700 dark:text-red-400 text-sm">
                                        {error}
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl text-gray-900 dark:text-white cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Nova Lozinka
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Unesite novu lozinku"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl focus:ring-2 focus:ring-infinity-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Minimum 6 karaktera
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Potvrdite Lozinku
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Potvrdite novu lozinku"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl focus:ring-2 focus:ring-infinity-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Resetovanje...
                                    </>
                                ) : (
                                    <>
                                        <Lock size={18} className="mr-2" />
                                        Resetuj Lozinku
                                    </>
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full text-gray-600 dark:text-gray-400 hover:text-infinity-green-600 dark:hover:text-infinity-green-400 transition-colors text-sm"
                            >
                                Nazad na početnu
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} InfinityPlay Radio
                    </p>
                </div>
            </div>
        </div>
    );
}
