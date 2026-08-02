import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Check, AlertCircle, ArrowLeft, MailCheck, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import { auth } from '../lib/api';

type Step = 'email' | 'pin' | 'password' | 'done';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const queryEmail = searchParams.get('email') || '';
    const alreadySent = searchParams.get('sent') === '1';

    const [step, setStep] = useState<Step>(queryEmail ? 'pin' : 'email');
    const [email, setEmail] = useState(queryEmail);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [devPin, setDevPin] = useState('');

    const autoSentRef = useRef(false);

    // If we arrived from the login "forgot password" link with an email but no
    // code yet, send one automatically so the user lands straight on the PIN
    // step with a real "we sent you a code" message. When sent=1 (admin already
    // sent, or coming from the email link) we skip the auto-send.
    useEffect(() => {
        if (queryEmail && !alreadySent && !autoSentRef.current) {
            autoSentRef.current = true;
            auth.requestPasswordReset(queryEmail)
                .then((d: any) => { if (d?.debug_code) setDevPin(d.debug_code); })
                .catch(() => {});
            setCooldown(30);
        }
    }, [queryEmail, alreadySent]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Step 1 → send code, advance to PIN step.
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError('Unesite email adresu.');
            return;
        }
        setLoading(true);
        try {
            const d: any = await auth.requestPasswordReset(email.trim());
            if (d?.debug_code) setDevPin(d.debug_code);
            setStep('pin');
            setCooldown(30);
        } catch (err: any) {
            setError(err?.message || 'Greška pri slanju koda. Pokušajte ponovo.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setError('');
        setInfo('');
        try {
            const d: any = await auth.requestPasswordReset(email.trim());
            if (d?.debug_code) setDevPin(d.debug_code);
            setInfo('Poslali smo vam novi kod.');
            setCooldown(30);
        } catch (err: any) {
            setError(err?.message || 'Greška pri slanju koda.');
        }
    };

    // Step 2 → validate the PIN (without consuming it), advance to password step.
    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (!/^\d{6}$/.test(code)) {
            setError('Unesite 6-cifreni kod iz emaila.');
            return;
        }
        setLoading(true);
        try {
            await auth.verifyResetCode(email.trim(), code);
            setStep('password');
        } catch (err: any) {
            setError(err?.message || 'Kod je netačan ili je istekao.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3 → set the new password (consumes the PIN).
    const handleSetPassword = async (e: React.FormEvent) => {
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
            await auth.resetPassword(email.trim(), code, password);
            setStep('done');
            setTimeout(() => navigate('/'), 3000);
        } catch (err: any) {
            // If the PIN expired between steps, send them back to the PIN step.
            setError(err?.message || 'Greška pri resetovanju lozinke.');
            if (String(err?.message || '').toLowerCase().includes('kod')) {
                setStep('pin');
            }
        } finally {
            setLoading(false);
        }
    };

    const stepIndex = step === 'email' ? 0 : step === 'pin' ? 1 : 2;

    const icon =
        step === 'done' ? <Check className="text-white" size={32} /> :
        step === 'password' ? <Lock className="text-white" size={32} /> :
        step === 'pin' ? <KeyRound className="text-white" size={32} /> :
        <MailCheck className="text-white" size={32} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-infinity-dark-900 via-infinity-dark-800 to-infinity-dark-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-infinity-dark-800 rounded-3xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
                            {icon}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                            {step === 'done' ? 'Gotovo!' : 'Resetovanje Lozinke'}
                        </h1>
                    </div>

                    {/* Step indicator (hidden on the success screen) */}
                    {step !== 'done' && (
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i <= stepIndex
                                            ? 'w-8 bg-infinity-green-500'
                                            : 'w-4 bg-gray-200 dark:bg-infinity-dark-600'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center space-x-2 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                            <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
                        </div>
                    )}
                    {info && (
                        <div className="flex items-center space-x-2 p-4 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                            <Check className="text-green-600 flex-shrink-0" size={20} />
                            <span className="text-green-700 dark:text-green-400 text-sm">{info}</span>
                        </div>
                    )}

                    {/* STEP 1 — email */}
                    {step === 'email' && (
                        <form onSubmit={handleSendCode} className="space-y-5">
                            <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                                Unesite email adresu vašeg naloga. Poslaćemo vam 6-cifreni PIN kod za resetovanje lozinke.
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="vas.email@primer.com"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl focus:ring-2 focus:ring-infinity-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                />
                            </div>
                            <Button type="submit" variant="primary" disabled={loading} className="w-full">
                                {loading ? 'Slanje...' : 'Pošalji mi PIN'}
                            </Button>
                        </form>
                    )}

                    {/* STEP 2 — PIN */}
                    {step === 'pin' && (
                        <form onSubmit={handleVerifyPin} className="space-y-5">
                            <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                                Poslali smo 6-cifreni PIN kod na<br />
                                <strong className="text-gray-800 dark:text-gray-200">{email}</strong>.<br />
                                Proverite inbox (i spam) pa unesite kod ispod.
                            </p>
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
                                autoFocus
                                className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 bg-white dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl focus:ring-2 focus:ring-infinity-green-500 focus:border-transparent text-gray-900 dark:text-white"
                            />
                            <Button type="submit" variant="primary" disabled={loading} className="w-full">
                                {loading ? 'Provera...' : 'Potvrdi PIN'}
                            </Button>
                            <div className="flex items-center justify-between text-sm">
                                <button
                                    type="button"
                                    onClick={() => { setStep('email'); setError(''); setInfo(''); }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ← Promeni email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={cooldown > 0}
                                    className="text-infinity-green-600 hover:text-infinity-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {cooldown > 0 ? `Pošalji ponovo (${cooldown}s)` : 'Pošalji ponovo'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3 — new password */}
                    {step === 'password' && (
                        <form onSubmit={handleSetPassword} className="space-y-5">
                            <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                                PIN je potvrđen. Unesite vašu novu lozinku.
                            </p>
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
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white dark:bg-infinity-dark-700 border border-gray-300 dark:border-infinity-dark-600 rounded-xl focus:ring-2 focus:ring-infinity-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 karaktera</p>
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
                            <Button type="submit" variant="primary" disabled={loading} className="w-full">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Čuvanje...
                                    </>
                                ) : (
                                    <>
                                        <Lock size={18} className="mr-2" />
                                        Sačuvaj novu lozinku
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* DONE */}
                    {step === 'done' && (
                        <div className="text-center space-y-4">
                            <p className="text-gray-600 dark:text-gray-400">
                                Vaša lozinka je uspešno promenjena.<br />
                                Preusmeravamo vas na početnu stranicu...
                            </p>
                            <Button variant="primary" onClick={() => navigate('/')} className="w-full">
                                Nazad na početnu
                            </Button>
                        </div>
                    )}

                    {step !== 'done' && (
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full flex items-center justify-center mt-5 text-gray-600 dark:text-gray-400 hover:text-infinity-green-600 dark:hover:text-infinity-green-400 transition-colors text-sm"
                        >
                            <ArrowLeft size={16} className="mr-1" />
                            Nazad na početnu
                        </button>
                    )}
                </div>

                <div className="text-center mt-8">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} InfinityPlay Radio
                    </p>
                </div>
            </div>
        </div>
    );
}
