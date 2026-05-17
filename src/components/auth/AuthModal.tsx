import Modal from '../ui/Modal';
import AuthForm from './AuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: {
    id: string;
    name: string;
    price: number;
  } | null;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultTab === 'login' ? 'Prijavi se' : 'Registruj se'}
    >
      <AuthForm
        defaultTab={defaultTab}
        onSuccess={onClose}
      />
    </Modal>
  );
}
