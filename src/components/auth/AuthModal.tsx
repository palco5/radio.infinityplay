import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import OnboardingModal from '../onboarding/OnboardingModal';
import { countries } from '../../lib/countries';
import { Mail, Lock, AlertCircle, CheckCircle, User, Phone } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: {
    id: string;
    name: string;
    price: number;
  } | null;
}

export default function AuthModal({ isOpen, onClose, selectedPlan }: AuthModalProps) {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+381');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        setSuccess('Uspešno ste se prijavili!');

        if (email === 'darkospira@gmail.com') {
          setTimeout(() => {
            onClose();
            navigate('/admin');
          }, 1500);
        } else {
          const user = localAuth.getCurrentUser();
          if (user) {
            const profile = localAuth.getProfile(user.id);

            setTimeout(() => {
              onClose();
              if (profile?.onboarding_completed && profile?.subscription_status === 'active') {
                navigate('/dashboard');
              } else if (!profile?.onboarding_completed) {
                setShowOnboarding(true);
              } else {
                navigate('/dashboard');
              }
            }, 1500);
          }
        }
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

        if (phoneNumber.length < 6 || phoneNumber.length > 15) {
          setError('Broj telefona mora biti između 6 i 15 cifara');
          setLoading(false);
          return;
        }

        await signUp(email, password);

        const newUser = localAuth.getCurrentUser();
        if (newUser) {
          localAuth.updateProfile(newUser.id, {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone_number: phoneNumber.trim(),
            country_code: countryCode,
            selected_plan_id: selectedPlan?.id || null,
          });
        }

        setSuccess('Registracija uspešna!');
        setTimeout(() => {
          onClose();
          setShowOnboarding(true);
        }, 1500);
      }
    } catch (err: any) {
      if (err.message.includes('Email not confirmed')) {
        setError('Molimo verifikujte vaš email pre prijavljivanja');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Neispravni podaci za prijavu');
      } else if (err.message.includes('User already registered')) {
        setError('Korisnik sa ovim emailom već postoji');
      } else {
        setError(err.message || 'Došlo je do greške');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setCountryCode('+381');
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isLogin ? 'Prijavi se' : 'Registruj se'}
      >
        {selectedPlan && (
          <div className="mb-6 p-4 bg-infinity-green-50 dark:bg-infinity-green-900/20 rounded-2xl border-2 border-infinity-green-500">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Odabrani paket:
            </p>
            <p className="text-lg font-bold text-infinity-green-700 dark:text-infinity-green-400">
              {selectedPlan.name} - {selectedPlan.price}€
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-green-700 dark:text-green-400">{success}</span>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ime *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      placeholder="Marko"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prezime *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      placeholder="Marković"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Broj Telefona *
                </label>
                <div className="flex space-x-2">
                  <div className="relative w-32">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full pl-3 pr-2 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none appearance-none cursor-pointer text-sm"
                      required
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.flag} {country.dialCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="pl-10"
                      placeholder="641234567"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Unesite broj telefona bez početne nule
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Adresa
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="vas.email@primer.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lozinka
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Potvrdi Lozinku
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Učitavanje...' : isLogin ? 'Prijavi se' : 'Registruj se'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-infinity-green-600 hover:text-infinity-green-700 font-medium"
          >
            {isLogin ? 'Nemate nalog? Registrujte se' : 'Već imate nalog? Prijavite se'}
          </button>
        </div>

        {!isLogin && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nakon registracije, primićete email za verifikaciju. Molimo proverite vaš inbox i kliknite na link za aktivaciju naloga.
            </p>
          </div>
        )}
      </Modal>
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={async () => {
          setShowOnboarding(false);
          const user = localAuth.getCurrentUser();
          if (user) {
            const profile = localAuth.getProfile(user.id);

            if (profile?.selected_plan_id) {
              navigate(`/payment?plan=${profile.selected_plan_id}`);
            } else if (selectedPlan) {
              navigate(`/payment?plan=${selectedPlan.id}`);
            } else {
              navigate('/payment');
            }
          }
        }}
      />
    </>
  );
}
