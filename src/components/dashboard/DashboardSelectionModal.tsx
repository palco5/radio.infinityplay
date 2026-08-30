import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { Shield, User } from 'lucide-react';

interface DashboardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardSelectionModal({ isOpen, onClose }: DashboardSelectionModalProps) {
  const navigate = useNavigate();

  const handleAdminDashboard = () => {
    onClose();
    navigate('/admin');
  };

  const handleUserDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Izaberite Dashboard" hideClose>
      <div className="space-y-4">
        <button
          onClick={handleAdminDashboard}
          className="w-full p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-700 rounded-2xl hover:scale-105 transition-all duration-200 group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="text-white" size={32} />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-1">
                Admin Dashboard
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upravljanje stanicama, korisnicima i pretplatama
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={handleUserDashboard}
          className="w-full p-6 bg-gradient-to-br from-infinity-green-50 to-infinity-green-100 dark:from-infinity-green-900/20 dark:to-infinity-green-800/20 border-2 border-infinity-green-200 dark:border-infinity-green-700 rounded-2xl hover:scale-105 transition-all duration-200 group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-infinity-green-500 to-infinity-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <User className="text-white" size={32} />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-1">
                Korisnički Dashboard
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Slušajte radio stanice i upravljajte vašom pretplatom
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Otkaži
        </button>
      </div>
    </Modal>
  );
}
