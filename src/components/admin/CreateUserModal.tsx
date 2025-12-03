import { useState } from 'react';
import { X, User, Mail, Lock, Building2, MapPin } from 'lucide-react';
import Button from '../ui/Button';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
}

const businessCategories = [
    { id: '1', name: 'restaurant', display_name_sr: 'Restoran', icon: '🍽️' },
    { id: '2', name: 'cafe', display_name_sr: 'Kafić', icon: '☕' },
    { id: '3', name: 'bar', display_name_sr: 'Bar', icon: '🍺' },
    { id: '4', name: 'gym', display_name_sr: 'Teretana', icon: '💪' },
    { id: '5', name: 'spa', display_name_sr: 'Spa', icon: '🧖' },
    { id: '6', name: 'retail', display_name_sr: 'Prodavnica', icon: '🛍️' },
    { id: '7', name: 'hotel', display_name_sr: 'Hotel', icon: '🏨' },
    { id: '8', name: 'office', display_name_sr: 'Kancelarija', icon: '🏢' },
    { id: '9', name: 'other', display_name_sr: 'Ostalo', icon: '📍' },
];

const subscriptionTiers = [
    { value: 'free', label: 'Besplatno' },
    { value: 'web-radio', label: 'Web Radio (15€)' },
    { value: 'box-radio', label: 'Box Radio (50€)' },
    { value: 'moj-radio', label: 'Moj Radio (240€)' },
];

const subscriptionStatuses = [
    { value: 'active', label: 'Aktivan' },
    { value: 'inactive', label: 'Neaktivan' },
    { value: 'trial', label: 'Probni period' },
    { value: 'cancelled', label: 'Otkazan' },
];

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        firstName: '',
        lastName: '',
        businessCategory: 'cafe',
        customLocation: '',
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        isAdmin: false,
        emailNotifications: true,
        newsletterSubscription: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validacija
            if (!formData.email || !formData.password) {
                throw new Error('Email i lozinka su obavezni');
            }

            if (formData.password.length < 6) {
                throw new Error('Lozinka mora imati najmanje 6 karaktera');
            }

            // Provera da li email već postoji
            const existingProfiles = localStorage.getItem('infinity_profiles');
            const profiles = existingProfiles ? JSON.parse(existingProfiles) : [];

            if (profiles.some((p: any) => p.email === formData.email)) {
                throw new Error('Korisnik sa ovim emailom već postoji');
            }

            // Kreiranje novog korisnika
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const newUser = {
                id: userId,
                email: formData.email,
                display_name: formData.displayName || formData.email.split('@')[0],
                first_name: formData.firstName || null,
                last_name: formData.lastName || null,
                avatar_url: '👤',
                business_category: formData.businessCategory,
                custom_location: formData.customLocation || null,
                subscription_status: formData.subscriptionStatus,
                subscription_tier: formData.subscriptionTier,
                subscription_ends_at: formData.subscriptionStatus === 'active'
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    : null,
                trial_started_at: formData.subscriptionStatus === 'trial'
                    ? new Date().toISOString()
                    : null,
                trial_ends_at: formData.subscriptionStatus === 'trial'
                    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    : null,
                is_admin: formData.isAdmin,
                email_notifications: formData.emailNotifications,
                newsletter_subscription: formData.newsletterSubscription,
                recommended_stations: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Dodaj korisnika u localStorage
            profiles.push(newUser);
            localStorage.setItem('infinity_profiles', JSON.stringify(profiles));

            // Dodaj credentials
            const credentials = localStorage.getItem('infinity_credentials');
            const creds = credentials ? JSON.parse(credentials) : {};
            creds[formData.email] = {
                password: formData.password,
                userId: userId
            };
            localStorage.setItem('infinity_credentials', JSON.stringify(creds));

            // Resetuj formu
            setFormData({
                email: '',
                password: '',
                displayName: '',
                firstName: '',
                lastName: '',
                businessCategory: 'cafe',
                customLocation: '',
                subscriptionTier: 'free',
                subscriptionStatus: 'active',
                isAdmin: false,
                emailNotifications: true,
                newsletterSubscription: false,
            });

            onUserCreated();
            onClose();
            alert('Korisnik uspešno kreiran!');
        } catch (err: any) {
            setError(err.message || 'Greška pri kreiranju korisnika');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-infinity-dark-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-infinity-dark-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                        Kreiraj Novog Korisnika
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-700 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Osnovni podaci */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                            <User className="mr-2" size={20} />
                            Osnovni Podaci
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                        placeholder="korisnik@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Lozinka <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                        placeholder="Minimum 6 karaktera"
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Prikazano Ime
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                placeholder="Kako će se korisnik zvati u aplikaciji"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ime
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                    placeholder="Ime"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Prezime
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                    placeholder="Prezime"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Biznis informacije */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                            <Building2 className="mr-2" size={20} />
                            Biznis Informacije
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Kategorija Biznisa
                            </label>
                            <select
                                value={formData.businessCategory}
                                onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                            >
                                {businessCategories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.icon} {cat.display_name_sr}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formData.businessCategory === 'other' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Lokacija / Opis
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={formData.customLocation}
                                        onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                        placeholder="Unesite lokaciju ili opis"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pretplata */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Pretplata</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Paket
                                </label>
                                <select
                                    value={formData.subscriptionTier}
                                    onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                >
                                    {subscriptionTiers.map((tier) => (
                                        <option key={tier.value} value={tier.value}>
                                            {tier.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.subscriptionStatus}
                                    onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                >
                                    {subscriptionStatuses.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Dodatne opcije */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Dodatne Opcije</h3>

                        <div className="space-y-3">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isAdmin}
                                    onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">
                                    Admin privilegije
                                </span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.emailNotifications}
                                    onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">
                                    Email notifikacije
                                </span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.newsletterSubscription}
                                    onChange={(e) => setFormData({ ...formData, newsletterSubscription: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">
                                    Newsletter pretplata
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Otkaži
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                        >
                            {loading ? 'Kreiranje...' : 'Kreiraj Korisnika'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
