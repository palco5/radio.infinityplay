import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/api';
import { countries } from '../../lib/countries';
import { AlertCircle, CheckCircle, MailCheck } from 'lucide-react';

interface AuthFormProps {
    defaultTab?: 'login' | 'register';
    onSuccess?: () => void;
}

export default function AuthForm({ defaultTab = 'login', onSuccess }: AuthFormProps) {
    const navigate = useNavigate();
    const { signUp, signIn, verifyEmail } = useAuth();
    const { resendCode } = auth;
    const [isLogin, setIsLogin] = useState(defaultTab === 'login');
    // 'form' = login/register, 'verify' = enter the emailed PIN
    const [view, setView] = useState<'form' | 'verify'>('form');
    const [pendingEmail, setPendingEmail] = useState('');
    const [verifyContext, setVerifyContext] = useState<'register' | 'login'>('register');
    const [code, setCode] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [devPin, setDevPin] = useState('');
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
                try {
                    await signIn(email, password);
                } catch (err: any) {
                    // Unverified account → switch to the PIN screen (backend has
                    // already emailed a fresh code).
                    if (err?.data?.requiresVerification || err?.status === 403) {
                        setPendingEmail(err?.data?.email || email);
                        if (err?.data?.debug_code) setDevPin(err.data.debug_code);
                        setVerifyContext('login');
                        setView('verify');
                        setSuccess('Poslali smo vam kod za verifikaciju na email.');
                        setResendCooldown(30);
                        setLoading(false);
                        return;
                    }
                    throw err;
                }
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

                const regData: any = await signUp(email, password, firstName, lastName, phoneNumber, countryCode, venueName);
                if (regData?.debug_code) setDevPin(regData.debug_code);
                // Blocking verification: show the PIN screen instead of logging in.
                setPendingEmail(email);
                setVerifyContext('register');
                setView('verify');
                setSuccess('Poslali smo vam 6-cifreni kod na email. Unesite ga da završite registraciju.');
                setResendCooldown(30);
                setLoading(false);
                return;
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

    // Countdown for the "resend code" button.
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!/^\d{6}$/.test(code)) {
            setError('Unesite 6-cifreni kod iz emaila');
            return;
        }

        setLoading(true);
        try {
            await verifyEmail(pendingEmail, code);
            setSuccess('Email je verifikovan!');
            setTimeout(() => {
                if (onSuccess) onSuccess();
                if (verifyContext === 'register') {
                    navigate('/subscription-options');
                } else if (pendingEmail === 'darkospira@gmail.com') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }, 1200);
        } catch (err: any) {
            setError(err?.message || 'Kod je netačan ili je istekao');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setSuccess('');
        try {
            const d: any = await resendCode(pendingEmail);
            if (d?.debug_code) setDevPin(d.debug_code);
            setSuccess('Novi kod je poslat na email.');
            setResendCooldown(30);
        } catch (err: any) {
            setError(err?.message || 'Greška pri slanju koda');
        }
    };

    const backToForm = () => {
        setView('form');
        setCode('');
        setError('');
        setSuccess('');
    };

    if (view === 'verify') {
        return (
            <div className="w-full">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-infinity-green-100 dark:bg-infinity-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MailCheck className="text-infinity-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verifikacija emaila</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Poslali smo 6-cifreni kod na<br />
                        <strong>{pendingEmail}</strong>
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
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

                    {devPin && (
                        <button
                            type="button"
                            onClick={() => setCode(devPin)}
                            className="w-full text-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-400 rounded-xl text-amber-800 dark:text-amber-300 text-sm"
                        >
                            🔧 DEV (samo lokalno): PIN je <strong className="tracking-widest">{devPin}</strong> — klikni da popuniš
                        </button>
                    )}
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="______"
                        className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 border-2 border-gray-300 dark:border-infinity-dark-700 rounded-infinity bg-white dark:bg-infinity-dark-900 text-gray-900 dark:text-white focus:border-infinity-green-500 focus:ring-2 focus:ring-infinity-green-200 outline-none"
                        autoFocus
                    />

                    <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                        {loading ? 'Provera...' : 'Potvrdi kod'}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                        <button
                            type="button"
                            onClick={backToForm}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ← Nazad
                        </button>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                            className="text-infinity-green-600 hover:text-infinity-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resendCooldown > 0 ? `Pošalji ponovo (${resendCooldown}s)` : 'Pošalji ponovo'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

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

                {isLogin && (
                    <div className="text-right -mt-1">
                        <button
                            type="button"
                            onClick={() => navigate(email.trim() ? `/reset-password?email=${encodeURIComponent(email.trim())}` : '/reset-password')}
                            className="text-sm text-infinity-green-600 hover:text-infinity-green-700 font-medium"
                        >
                            Zaboravili ste šifru?
                        </button>
                    </div>
                )}

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
                                href="/terms-of-service"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-infinity-green-600 hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Uslove korišćenja
                            </a>{' '}
                            i{' '}
                            <a
                                href="/privacy-policy"
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
                        Nakon registracije, primićete 6-cifreni kod na email. Unesite ga da aktivirate nalog.
                    </p>
                </div>
            )}
        </div>
    );
}
