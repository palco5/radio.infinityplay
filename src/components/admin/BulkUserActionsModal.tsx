import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserProfile } from '../../types';
import { profiles as profilesApi } from '../../lib/api';
import { Users, Check, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface BulkUserActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: UserProfile[];
    onSuccess: () => void;
}

type BulkAction = 'activate' | 'deactivate' | 'delete';

export default function BulkUserActionsModal({ isOpen, onClose, users, onSuccess }: BulkUserActionsModalProps) {
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<BulkAction>('activate');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const toggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const handleBulkAction = async () => {
        if (selectedUsers.size === 0) {
            setError('Morate izabrati bar jednog korisnika');
            return;
        }

        setProcessing(true);
        setError('');
        setSuccess('');

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const updates = Array.from(selectedUsers).map(async (userId) => {
                switch (action) {
                    case 'activate':
                        await profilesApi.update(userId, { subscription_status: 'active' });
                        break;
                    case 'deactivate':
                        await profilesApi.update(userId, { subscription_status: 'inactive' });
                        break;
                    case 'delete':
                        await profilesApi.delete(userId);
                        break;
                }
            });

            await Promise.all(updates);

            const actionText = action === 'activate' ? 'aktivirano' :
                action === 'deactivate' ? 'deaktivirano' : 'obrisano';
            setSuccess(`Uspešno ${actionText} ${selectedUsers.size} korisnika!`);

            setTimeout(() => {
                onSuccess();
                onClose();
                setSelectedUsers(new Set());
            }, 2000);
        } catch (err: any) {
            setError('Greška prilikom izvršavanja akcije');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Operacije nad Korisnicima">
            <div className="space-y-4">
                {error && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                        <AlertCircle className="text-red-600" size={20} />
                        <span className="text-red-700 dark:text-red-400">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                        <Check className="text-green-600" size={20} />
                        <span className="text-green-700 dark:text-green-400">{success}</span>
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                    <div className="flex items-start space-x-3">
                        <Users className="text-blue-600 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                Izaberite Akciju
                            </h4>
                            <div className="space-y-2 mt-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="action"
                                        value="activate"
                                        checked={action === 'activate'}
                                        onChange={(e) => setAction(e.target.value as BulkAction)}
                                        className="text-infinity-green-600 focus:ring-infinity-green-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Aktiviraj Korisnike</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="action"
                                        value="deactivate"
                                        checked={action === 'deactivate'}
                                        onChange={(e) => setAction(e.target.value as BulkAction)}
                                        className="text-infinity-green-600 focus:ring-infinity-green-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Deaktiviraj Korisnike</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="action"
                                        value="delete"
                                        checked={action === 'delete'}
                                        onChange={(e) => setAction(e.target.value as BulkAction)}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-red-700 dark:text-red-400">Obriši Korisnike (Soft Delete)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-infinity-dark-700 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <button
                            onClick={toggleAll}
                            className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-infinity-green-600"
                        >
                            {selectedUsers.size === users.length ? (
                                <CheckSquare className="text-infinity-green-600" size={18} />
                            ) : (
                                <Square size={18} />
                            )}
                            <span>Izaberi Sve ({users.length})</span>
                        </button>
                        <span className="text-sm text-gray-500">
                            Izabrano: {selectedUsers.size}
                        </span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className={`p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-infinity-dark-700 cursor-pointer transition-colors ${selectedUsers.has(user.id) ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20' : ''
                                    }`}
                                onClick={() => toggleUser(user.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    {selectedUsers.has(user.id) ? (
                                        <CheckSquare className="text-infinity-green-600 flex-shrink-0" size={18} />
                                    ) : (
                                        <Square className="text-gray-400 flex-shrink-0" size={18} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {user.venue_name || user.display_name || user.email}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscription_status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {user.subscription_status}
                                        </span>
                                        <span className="px-2 py-1 bg-infinity-green-100 dark:bg-infinity-green-900/30 text-infinity-green-700 dark:text-infinity-green-400 rounded-full text-xs font-medium uppercase">
                                            {user.subscription_tier}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={processing}>
                        Odustani
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleBulkAction}
                        disabled={processing || selectedUsers.size === 0}
                        className={action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        {processing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Obrada...
                            </>
                        ) : (
                            <>
                                {action === 'activate' && 'Aktiviraj'}
                                {action === 'deactivate' && 'Deaktiviraj'}
                                {action === 'delete' && 'Obriši'}
                                {' '}({selectedUsers.size})
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
