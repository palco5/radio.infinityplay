import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserProfile } from '../../types';
import { Mail, Send, AlertCircle, Check } from 'lucide-react';
import { auth } from '../../lib/api';

interface SendPasswordResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
}

export default function SendPasswordResetModal({ isOpen, onClose, user }: SendPasswordResetModalProps) {
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSendReset = async () => {
        setSending(true);
        setError('');

        try {
            // Server generates a 6-digit PIN, stores it, and emails it to the
            // user. The admin never sees the code.
            await auth.requestPasswordReset(user.email);
            setSent(true);
            setTimeout(() => {
                onClose();
                setSent(false);
            }, 3000);
        } catch (err: any) {
            console.error('Greška:', err);
            setError(err?.message || 'Greška prilikom slanja emaila. Pokušajte ponovo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pošalji Kod za Resetovanje Lozinke">
            <div className="space-y-4">
                {error && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                        <AlertCircle className="text-red-600" size={20} />
                        <span className="text-red-700 dark:text-red-400">{error}</span>
                    </div>
                )}

                {sent ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <Check className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Kod Poslat!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center">
                            Korisniku je poslat 6-cifreni kod za resetovanje lozinke na email.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <Mail className="text-blue-600 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                        Korisniku će biti poslat email sa kodom
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Email adresa: <strong>{user.email}</strong>
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Korisnik dobija 6-cifreni kod (važi 15 minuta) koji unosi na
                                        stranici za resetovanje lozinke da postavi novu lozinku.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button variant="ghost" onClick={onClose} disabled={sending}>
                                Odustani
                            </Button>
                            <Button variant="primary" onClick={handleSendReset} disabled={sending}>
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Slanje...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} className="mr-2" />
                                        Pošalji Kod
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
