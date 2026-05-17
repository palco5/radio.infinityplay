import { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { profiles } from '../../lib/api';
import { X, User, MapPin, Radio } from 'lucide-react';
import { JingleManagement } from './JingleManagement';

interface EditUserModalProps {
    user: UserProfile;
    onClose: () => void;
    onSuccess: () => void;
    isOpen?: boolean;
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        display_name: user.display_name || '',
        subscription_status: user.subscription_status,
        subscription_tier: user.subscription_tier,
        custom_location: user.custom_location || '',
        jingle_interval_minutes: user.jingle_interval_minutes || 7,
        my_radio_stream_url: user.my_radio_stream_url || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setFormData({
            display_name: user.display_name || '',
            subscription_status: user.subscription_status,
            subscription_tier: user.subscription_tier,
            custom_location: user.custom_location || '',
            jingle_interval_minutes: user.jingle_interval_minutes || 7,
            my_radio_stream_url: user.my_radio_stream_url || '',
        });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const updates: Partial<UserProfile> = {
            display_name: formData.display_name,
            subscription_status: formData.subscription_status as any,
            subscription_tier: formData.subscription_tier as any,
            custom_location: formData.custom_location,
            jingle_interval_minutes: Number(formData.jingle_interval_minutes),
            my_radio_stream_url: formData.my_radio_stream_url ?? '',
        };

        try {
            await profiles.update(user.id, updates);
            setSuccess('Korisnik uspešno ažuriran!');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error updating user:', error);
            setError(error.message || 'Došlo je do greške prilikom ažuriranja korisnika.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold dark:text-gray-100">Uredi Korisnika</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Status Pretplate */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.subscription_status}
                                    onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as any })}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 p-2"
                                >
                                    <option value="active">Aktivna</option>
                                    <option value="inactive">Neaktivna</option>
                                    <option value="trial">Probni Period</option>
                                    <option value="expired">Istekla</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Paket
                                </label>
                                <select
                                    value={formData.subscription_tier}
                                    onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value as any })}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 p-2"
                                >
                                    <option value="free">Besplatan</option>
                                    <option value="basic-radio">Basic Radio</option>
                                    <option value="branded-radio">Branded Radio</option>
                                    <option value="host-radio">Host Radio</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ime za prikaz (Ime Radija)
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                />
                            </div>
                        </div>

                        {user.business_category === 'Other' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Lokacija (Custom)
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.custom_location}
                                        onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                        placeholder="Npr. Hotel Grand Kopaonik"
                                    />
                                </div>
                            </div>
                        )}

                        <hr className="border-gray-200 dark:border-gray-700" />

                        {/* Moj Radio Stream */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                                <Radio size={18} className="text-pink-500" />
                                Moj Radio — Stream URL
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Unesite stream URL za ovog korisnika. Ostavite prazno ako korisnik nema personalni radio.
                            </p>
                            <div className="relative">
                                <Radio className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400" size={18} />
                                <input
                                    type="url"
                                    value={formData.my_radio_stream_url || ''}
                                    onChange={(e) => setFormData({ ...formData, my_radio_stream_url: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-400 outline-none"
                                    placeholder="https://stream.example.com/live"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Upravljanje Džinglovima
                            </h3>
                            <JingleManagement userId={user.id} />
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        disabled={loading}
                    >
                        Otkaži
                    </button>
                    <button
                        type="submit"
                        form="edit-user-form"
                        className="px-4 py-2 bg-infinity-green-600 hover:bg-infinity-green-500 text-white rounded-lg transition-colors shadow-lg shadow-infinity-green-600/20 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Čuvanje...' : 'Sačuvaj Izmene'}
                    </button>
                </div>
            </div>
        </div>
    );
}
