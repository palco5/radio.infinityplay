import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import { BusinessCategory } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { User, AlertCircle, Sparkles, Building2 } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const avatarOptions = [
  '😀', '😎', '🥳', '🤓', '😇',
  '🦸', '🦹', '🧙', '🧚', '🧛',
  '🐶', '🐱', '🐭', '🐹', '🐰',
  '🦊', '🐻', '🐼', '🐨', '🐯'
];

export default function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😀');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);


  const fallbackCategories: BusinessCategory[] = [
    { id: '1', name: 'cafe', display_name_sr: 'Kafić', icon: '☕', sort_order: 1, created_at: '' },
    { id: '2', name: 'restaurant', display_name_sr: 'Restoran', icon: '🍽️', sort_order: 2, created_at: '' },
    { id: '3', name: 'bar', display_name_sr: 'Bar', icon: '🍸', sort_order: 3, created_at: '' },
    { id: '4', name: 'gym', display_name_sr: 'Teretana', icon: '💪', sort_order: 4, created_at: '' },
    { id: '5', name: 'hotel', display_name_sr: 'Hotel', icon: '🏨', sort_order: 5, created_at: '' },
    { id: '6', name: 'shopping_center', display_name_sr: 'Shopping Centar', icon: '🛍️', sort_order: 6, created_at: '' },
    { id: '7', name: 'beauty_salon', display_name_sr: 'Salon Lepote', icon: '💅', sort_order: 7, created_at: '' },
    { id: '8', name: 'medical_center', display_name_sr: 'Medicinski Centar', icon: '🏥', sort_order: 8, created_at: '' },
    { id: '9', name: 'spa', display_name_sr: 'Spa Centar', icon: '🧖', sort_order: 9, created_at: '' },
    { id: '10', name: 'office', display_name_sr: 'Kancelarija', icon: '🏢', sort_order: 10, created_at: '' },
    { id: '11', name: 'retail_store', display_name_sr: 'Prodavnica', icon: '🏪', sort_order: 11, created_at: '' },
    { id: '12', name: 'other', display_name_sr: 'Ostalo', icon: '📍', sort_order: 12, created_at: '' },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setCategoriesLoading(true);

    try {
      // Simuliramo API poziv
      await new Promise(resolve => setTimeout(resolve, 500));
      setCategories(fallbackCategories);
      if (fallbackCategories.length > 0) {
        setSelectedCategory(fallbackCategories[0].name);
      }
    } catch (err) {
      console.error('Greška pri fetchovanju kategorija:', err);
      setCategories(fallbackCategories);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      setError('Molimo unesite naziv');
      return;
    }

    if (!selectedCategory) {
      setError('Molimo izaberite kategoriju');
      return;
    }

    if (selectedCategory === 'other' && !customLocation.trim()) {
      setError('Molimo unesite gde ćete puštati radio');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updated = localAuth.updateProfile(user.id, {
        display_name: displayName.trim(),
        avatar_url: selectedAvatar,
        business_category: selectedCategory,
        custom_location: selectedCategory === 'other' ? customLocation.trim() : null,
        onboarding_completed: true,
      });

      if (!updated) throw new Error('Greška pri ažuriranju profila');

      await refreshProfile();
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Greška pri čuvanju profila');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} title="Personalizujte Vaš Profil">
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={32} />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Hajde da personalizujemo vaš profil! Izaberite avatar, unesite nadimak i odaberite kategoriju vašeg poslovanja.
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
            Napomena: Ako preskočite ovaj korak, moći ćete da popunite ove informacije kasnije, ali će vam se ovaj prozor prikazivati pri svakom logovanju dok ne popunite profil.
          </p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2">
            VAŽNO: Kategorija poslovanja se može izabrati samo jednom i ne može biti promenjena naknadno!
          </p>
        </div>

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
              placeholder="Npr. Caffe Bar Infinity ili vaš nadimak"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Možete uneti naziv objekta, vaše ime ili nadimak - ovo će biti prikazano na vašem profilu
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Odaberite Avatar
          </label>
          <div className="grid grid-cols-5 gap-3 max-h-48 overflow-y-auto">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                type="button"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kategorija Poslovanja *
          </label>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-infinity-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Učitavam kategorije...</span>
            </div>
          ) : (
            <>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none appearance-none cursor-pointer"
                  disabled={categories.length === 0}
                >
                  {categories.length === 0 && (
                    <option value="">Nema dostupnih kategorija</option>
                  )}
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.icon} {category.display_name_sr}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Izaberite kategoriju koja najbolje opisuje vaš objekat. Ova opcija se ne može promeniti kasnije!
              </p>

              {selectedCategory === 'other' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gde ćete puštati radio? *
                  </label>
                  <Input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Npr. Ordinacija, Frizerski salon, Autoperionica..."
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Pomozite nam da vam preporučimo najbolje stanice za vaš prostor
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleSkip}
            disabled={loading}
          >
            Preskoči
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
