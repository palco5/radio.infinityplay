import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { User, Check, AlertCircle } from 'lucide-react';

interface ProfileManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const avatarOptions = [
  '😀', '😎', '🥳', '🤓', '😇',
  '🦸', '🦹', '🧙', '🧚', '🧛',
  '🐶', '🐱', '🐭', '🐹', '🐰',
  '🦊', '🐻', '🐼', '🐨', '🐯'
];

export default function ProfileManagement({ isOpen, onClose }: ProfileManagementProps) {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😀');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = () => {
    if (!user) return;

    const profile = localAuth.getProfile(user.id);

    if (profile) {
      setDisplayName(profile.display_name || '');
      setSelectedAvatar(profile.avatar_url || '😀');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updated = localAuth.updateProfile(user.id, {
        display_name: displayName,
        avatar_url: selectedAvatar,
      });

      if (!updated) throw new Error('Greška pri ažuriranju profila');

      setSuccess('Profil uspešno ažuriran!');

      await refreshProfile();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Greška pri ažuriranju profila');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Moj Nalog">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nadimak
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-10"
              placeholder="Unesite vaš nadimak"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Odaberite Avatar
          </label>
          <div className="grid grid-cols-5 gap-3">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-full aspect-square text-4xl flex items-center justify-center rounded-2xl transition-all ${selectedAvatar === avatar
                    ? 'bg-gradient-infinity shadow-glow-green scale-110 ring-4 ring-infinity-green-500'
                    : 'bg-gray-100 dark:bg-infinity-dark-700 hover:scale-105 hover:bg-gray-200 dark:hover:bg-infinity-dark-600'
                  }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-infinity-green-50 dark:bg-infinity-green-900/20 p-4 rounded-2xl border border-infinity-green-200 dark:border-infinity-green-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Email:</strong> {user?.email}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Email se ne može promeniti
          </p>
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
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj Izmene'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
