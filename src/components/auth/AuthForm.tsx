import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { countries } from '../../lib/countries';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AuthFormProps {
    defaultTab?: 'login' | 'register';
    onSuccess?: () => void;
}

export default function AuthForm({ defaultTab = 'login', onSuccess }: AuthFormProps) {
    const navigate = useNavigate();
    const { signUp, signIn } = useAuth();
    const [isLogin, setIsLogin] = useState(defaultTab === 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+381');
    const [venueName, setVenueName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                setSuccess('Uspešno ste se prijavili!');

                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    if (email === 'darkospira@gmail.com') {
                        navigate('/admin');
                    } else {
                        navigate('/dashboard');
                    }
                }, 1500);
            } else {
                if (password !== confirmPassword) {
                    setError('Lozinke se ne poklapaju');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    setError('Lozinka mora imati najmanje 6 karaktera');
                    setLoading(false);
                    return;
                }

                if (!firstName.trim()) {
                    setError('Ime je obavezno polje');
                    setLoading(false);
                    return;
                }

                if (!lastName.trim()) {
                    setError('Prezime je obavezno polje');
                    setLoading(false);
                    return;
                }

                if (!phoneNumber.trim()) {
                    setError('Broj telefona je obavezan');
                    setLoading(false);
                    return;
                }

                if (!venueName.trim()) {
                    setError('Naziv lokala je obavezno polje');
                    setLoading(false);
                    return;
                }

                if (!agreedToTerms) {
                    setError('Morate prihvatiti Uslove korišćenja i Politiku privatnosti');
                    setLoading(false);
                    return;
                }

                await signUp(email, password, firstName, lastName, phoneNumber, countryCode, venueName);
                setSuccess('Registracija uspešna!');

                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    navigate('/subscription-options');
                }, 1500);
            }
        } catch (err: any) {
            if (err.message && err.message.includes('Email not confirmed')) {
                setError('Molimo verifikujte vaš email pre prijavljivanja');
            } else if (err.message && (err.message.includes('Invalid credentials') || err.message.includes('password'))) {
                setError('Neispravni podaci za prijavu');
            } else if (err.message && err.message.includes('exists')) {
                setError('Korisnik sa ovim emailom već postoji');
            } else {
                setError(err.message || 'Došlo je do greške');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="flex items-start space-x-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-red-700 dark:text-red-400 font-roboto text-sm">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="flex items-start space-x-2 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-green-700 dark:text-green-400 font-roboto text-sm">{success}</span>
                    </div>
                )}

                {!isLogin && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="Ime *"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Marko"
                                required
                            />
                            <Input
                                label="Prezime *"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Marković"
                                required
                            />
                        </div>

                        <Input
                            label="Naziv Lokala *"
                            type="text"
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="npr. Kafić Sunce, Restoran Stari Grad..."
                            required
                        />

                        <div>
                            <label className="block text-sm font-roboto font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Broj Telefona *
                            </label>
                            <div className="flex gap-2">
                                <div className="relative w-28 sm:w-32 flex-shrink-0">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="w-full pl-2 sm:pl-3 pr-1 py-3 border-2 border-gray-300 dark:border-infinity-dark-700 rounded-infinity bg-white dark:bg-infinity-dark-900 text-gray-900 dark:text-white focus:border-infinity-green-500 focus:ring-2 focus:ring-infinity-green-200 outline-none appearance-none cursor-pointer text-sm transition-all"
                                        required
                                    >
                                        {countries.map((country) => (
                                            <option key={country.code} value={country.dialCode}>
                                                {country.flag} {country.dialCode}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="641234567"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <Input
                    label="Email Adresa"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas.email@primer.com"
                    required
                />

                <Input
                    label="Lozinka"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                {!isLogin && (
                    <Input
                        label="Potvrdi Lozinku"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                )}

                {!isLogin && (
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
                            Prihvatam{' '}
                            <a
                                href="/#/terms-of-service"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-infinity-green-600 hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Uslove korišćenja
                            </a>{' '}
                            i{' '}
                            <a
                                href="/#/privacy-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-infinity-green-600 hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Politiku privatnosti
                            </a>{' '}
                            InfinityPlay Radio platforme.
                        </span>
                    </label>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={loading || (!isLogin && !agreedToTerms)}
                    className="mt-6"
                >
                    {loading ? 'Učitavanje...' : isLogin ? 'Prijavi se' : 'Registruj se'}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={toggleMode}
                    className="text-infinity-green-600 hover:text-infinity-green-700 font-medium font-roboto text-sm sm:text-base"
                >
                    {isLogin ? 'Nemate nalog? Registrujte se' : 'Već imate nalog? Prijavite se'}
                </button>
            </div>

            {!isLogin && (
                <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-roboto">
                        Nakon registracije, primićete email za verifikaciju. Molimo proverite vaš inbox i kliknite na link za aktivaciju naloga.
                    </p>
                </div>
            )}
        </div>
    );
}
