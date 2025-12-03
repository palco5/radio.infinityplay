import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserProfile } from '../../types';
import { localAuth } from '../../lib/localStorage';
import { User, Mail, MapPin, Music, Clock, Save } from 'lucide-react';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
    onSuccess: () => void;
}

export default function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        display_name: '',
        email: '',
        subscription_status: '',
        subscription_tier: '',
        custom_location: '',
        jingle_url: '',
        jingle_interval_minutes: 7,
    });

    useEffect(() => {
        if (user) {
            setFormData({
                display_name: user.display_name || '',
                email: user.email,
                subscription_status: user.subscription_status,
                subscription_tier: user.subscription_tier || 'free',
                custom_location: user.custom_location || '',
                jingle_url: user.jingle_url || '',
                jingle_interval_minutes: user.jingle_interval_minutes || 7,
            });
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const updates: Partial<UserProfile> = {
            display_name: formData.display_name,
            subscription_status: formData.subscription_status as any,
            subscription_tier: formData.subscription_tier as any,
            custom_location: formData.custom_location,
            jingle_url: formData.jingle_url,
            jingle_interval_minutes: Number(formData.jingle_interval_minutes),
        };

        try {
            const success = localAuth.updateProfile(user.id, updates);

            if (success) {
                onSuccess();
            } else {
                alert('Došlo je do greške prilikom ažuriranja korisnika.');
            }
        } catch (error: any) {
            if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
                alert('Greška: Džingl je preveliki za lokalno čuvanje! Molimo koristite manji fajl (ispod 3MB) ili koristite URL.');
            } else {
                alert('Došlo je do neočekivane greške: ' + error.message);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Izmeni Korisnika">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ime i Prezime / Naziv
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Adresa
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-infinity-dark-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status Pretplate
                        </label>
                        <select
                            value={formData.subscription_status}
                            onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                        >
                            <option value="active">Aktivan</option>
                            <option value="inactive">Neaktivan</option>
                            <option value="trial">Probni period</option>
                            <option value="cancelled">Otkazan</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Paket
                        </label>
                        <select
                            value={formData.subscription_tier}
                            onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                        >
                            <option value="free">Besplatan</option>
                            <option value="ad-free">Basic Radio</option>
                            <option value="branded-radio">Branded Radio</option>
                            <option value="host-radio">Host Radio</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lokacija (za "Ostalo" kategoriju)
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={formData.custom_location}
                            onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
                            placeholder="npr. Ime Ulice 123"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Music className="mr-2 text-infinity-green-600" size={20} />
                        Podešavanja Džingla
                    </h4>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                URL do MP3 fajla ili Upload
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={formData.jingle_url}
                                    onChange={(e) => setFormData({ ...formData, jingle_url: e.target.value })}
                                    placeholder="https://example.com/jingle.mp3"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                />
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">ili</span>
                                    <input
                                        type="file"
                                        accept="audio/mp3,audio/mpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                // Provera veličine (max 3MB za localStorage)
                                                if (file.size > 3 * 1024 * 1024) {
                                                    alert('Fajl je preveliki! Maksimalna veličina za džingl je 3MB.');
                                                    e.target.value = ''; // Reset input
                                                    return;
                                                }

                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData({ ...formData, jingle_url: reader.result as string });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-infinity-green-50 file:text-infinity-green-700 hover:file:bg-infinity-green-100"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Unesite direktan link ili uploadujte MP3 fajl sa računara.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Interval puštanja (minuti)
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.jingle_interval_minutes}
                                    onChange={(e) => setFormData({ ...formData, jingle_interval_minutes: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Odustani
                    </Button>
                    <Button variant="primary" type="submit">
                        <Save size={18} className="mr-2" />
                        Sačuvaj Izmene
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
