import { useState, useEffect } from 'react';
import { UserProfile, RadioStation } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Star, Check } from 'lucide-react';

interface RecommendStationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
    stations: RadioStation[];
    onSave: (userId: string, stationIds: string[]) => void;
}

export default function RecommendStationsModal({
    isOpen,
    onClose,
    user,
    stations,
    onSave,
}: RecommendStationsModalProps) {
    const [stationList, setStationList] = useState<RadioStation[]>([]);
    const [selectedStations, setSelectedStations] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setStationList(stations.filter(s => s.is_active));
            setSelectedStations(user.recommended_stations || []);
        }
    }, [isOpen, user, stations]);

    const toggleStation = (stationId: string) => {
        setSelectedStations((prev) =>
            prev.includes(stationId)
                ? prev.filter((id) => id !== stationId)
                : [...prev, stationId]
        );
    };

    const handleSave = () => {
        onSave(user.id, selectedStations);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Preporuči Stanice Korisniku">
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Korisnik:</strong> {user.display_name || user.email}
                    </p>
                    {user.business_category && (
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                            <strong>Kategorija:</strong> {user.business_category}
                        </p>
                    )}
                    {user.custom_location && (
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                            <strong>Lokacija:</strong> {user.custom_location}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Izaberite stanice koje želite da preporučite ovom korisniku:
                    </p>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {stationList.map((station) => {
                            const isSelected = selectedStations.includes(station.id);
                            const isRecommendedForCategory = user.business_category &&
                                station.recommended_for.some(cat =>
                                    cat.toLowerCase().includes(user.business_category?.toLowerCase() || '')
                                );

                            return (
                                <button
                                    key={station.id}
                                    onClick={() => toggleStation(station.id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-infinity-green-500 bg-infinity-green-50 dark:bg-infinity-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 flex-1">
                                            <div className="text-3xl">{station.icon_emoji}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {station.name}
                                                    </p>
                                                    {isRecommendedForCategory && (
                                                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full flex items-center">
                                                            <Star size={12} className="mr-1" />
                                                            Preporučeno
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {station.description || station.genre}
                                                </p>
                                                {station.recommended_for.length > 0 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                        Za: {station.recommended_for.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                ? 'bg-infinity-green-500 border-infinity-green-500'
                                                : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                        >
                                            {isSelected && <Check className="text-white" size={16} />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" fullWidth onClick={onClose}>
                        Otkaži
                    </Button>
                    <Button variant="primary" fullWidth onClick={handleSave}>
                        Sačuvaj Preporuke ({selectedStations.length})
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
