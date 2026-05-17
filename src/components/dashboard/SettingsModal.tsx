import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { profiles as profilesApi } from '../../lib/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Moon, Sun, Mail, Bell, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newsletterSubscription, setNewsletterSubscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user && profile) {
      fetchSettings();
    }
  }, [isOpen, user, profile]);

  const fetchSettings = async () => {
    if (!profile) return;
    setEmailNotifications(profile.email_notifications ?? true);
    setNewsletterSubscription(profile.newsletter_subscribed ?? false);
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await profilesApi.update(user.id, {
        email_notifications: emailNotifications,
        newsletter_subscribed: newsletterSubscription,
      });



      await refreshProfile();

      setSuccess('Podešavanja uspešno sačuvana!');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Greška pri čuvanju podešavanja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Podešavanja">
      <div className="space-y-6">
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <Check className="text-green-600" size={20} />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-infinity-dark-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {theme === 'dark' ? (
                  <Moon className="text-infinity-green-500" size={24} />
                ) : (
                  <Sun className="text-infinity-green-600" size={24} />
                )}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Tema</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {theme === 'dark' ? 'Tamna' : 'Svetla'} tema
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-infinity-green-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-infinity-dark-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Email Notifikacije</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Primaj notifikacije o novostima
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${emailNotifications ? 'bg-infinity-green-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-infinity-dark-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="text-orange-600" size={24} />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Newsletter</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Primaj newsletter i promocije
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewsletterSubscription(!newsletterSubscription)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${newsletterSubscription ? 'bg-infinity-green-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${newsletterSubscription ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Otkaži
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
