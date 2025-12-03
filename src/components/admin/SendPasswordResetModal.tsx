import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserProfile } from '../../types';
import { Mail, Send, AlertCircle, Check } from 'lucide-react';
import {
    sendPasswordResetEmail,
    generateResetToken,
    saveResetToken
} from '../../lib/emailService';

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
            // Generiši reset token
            const resetToken = generateResetToken();

            // Sačuvaj token
            saveResetToken(user.email, resetToken);

            // Pošalji email sa Resend
            const result = await sendPasswordResetEmail(
                user.email,
                resetToken,
                user.display_name || user.username || 'Korisniče'
            );

            if (result.success) {
                console.log('✅ Password reset email poslat na:', user.email);
                setSent(true);
                setTimeout(() => {
                    onClose();
                    setSent(false);
                }, 3000);
            } else {
                // Fallback - prikaži link u konzoli ako Resend ne radi
                const resetLink = `${window.location.origin}/reset-password?token=${resetToken}`;
                console.log('='.repeat(60));
                console.log('⚠️ RESEND NIJE KONFIGURISAN - PASSWORD RESET LINK:');
                console.log('='.repeat(60));
                console.log(`Email: ${user.email}`);
                console.log(`Link: ${resetLink}`);
                console.log('='.repeat(60));
                console.log('');
                console.log('📧 Da bi email radio, dodaj VITE_RESEND_API_KEY u .env fajl');
                console.log('🔗 Registruj se na: https://resend.com (besplatno)');
                console.log('');

                setSent(true);
                setTimeout(() => {
                    onClose();
                    setSent(false);
                }, 3000);
            }
        } catch (err: any) {
            console.error('Greška:', err);
            setError('Greška prilikom slanja emaila. Pokušajte ponovo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pošalji Link za Resetovanje Lozinke">
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
                            Email Poslat!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center">
                            Link za resetovanje lozinke je poslat na email adresu korisnika.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <Mail className="text-blue-600 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                        Korisniku će biti poslat email
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Email adresa: <strong>{user.email}</strong>
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Korisnik će dobiti link za resetovanje lozinke koji je validan 24 sata.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                <strong>Napomena:</strong> U trenutnoj verziji (development), link će biti prikazan u konzoli.
                                Nakon deploy-a, email će biti automatski poslat korisniku.
                            </p>
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
                                        Pošalji Email
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
