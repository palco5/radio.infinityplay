import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import DashboardSelectionModal from '../dashboard/DashboardSelectionModal';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDashboardSelection, setShowDashboardSelection] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMenuOpen(false);
  };

  const handleDashboardClick = () => {
    setIsMenuOpen(false);
    if (user?.email === 'darkospira@gmail.com') {
      setShowDashboardSelection(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Greška pri odjavi:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-infinity-dark-900/90 backdrop-blur-md shadow-lg transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="logo.png"
              alt="InfinityPlay Radio"
              className="h-12 w-auto object-contain"
            />
          </button>

          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => scrollToSection('home')}
              className="text-gray-700 dark:text-gray-300 hover:text-infinity-green-600 transition-colors font-roboto"
            >
              Početna
            </button>
            <button
              onClick={() => scrollToSection('stations')}
              className="text-gray-700 dark:text-gray-300 hover:text-infinity-green-600 transition-colors font-roboto"
            >
              Naše Stanice
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-gray-700 dark:text-gray-300 hover:text-infinity-green-600 transition-colors font-roboto"
            >
              Pretplate
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="text-gray-700 dark:text-gray-300 hover:text-infinity-green-600 transition-colors font-roboto"
            >
              Kontakt
            </button>

          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="text-infinity-green-500" size={20} />
              ) : (
                <Moon className="text-gray-700" size={20} />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDashboardClick}
                >
                  {profile?.avatar_url ? (
                    <span className="text-xl mr-2">{profile.avatar_url}</span>
                  ) : (
                    <User size={18} className="mr-2" />
                  )}
                  {profile?.display_name || user?.email?.split('@')[0] || 'Moj Nalog'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Odjavi se
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={() => scrollToSection('pricing')}>
                Započni Besplatno
              </Button>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? (
              <X className="text-gray-700 dark:text-white" size={24} />
            ) : (
              <Menu className="text-gray-700 dark:text-white" size={24} />
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <button
              onClick={() => scrollToSection('home')}
              className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-lg"
            >
              Početna
            </button>
            <button
              onClick={() => scrollToSection('stations')}
              className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-lg"
            >
              Naše Stanice
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-lg"
            >
              Pretplate
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 rounded-lg"
            >
              Kontakt
            </button>

            <div className="flex items-center space-x-2 px-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-infinity-green-50 dark:hover:bg-infinity-dark-800 flex-1"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
            {user ? (
              <div className="px-4 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleDashboardClick}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {profile?.avatar_url ? (
                      <span className="text-xl">{profile.avatar_url}</span>
                    ) : (
                      <User size={18} />
                    )}
                    <span>{profile?.display_name || user?.email?.split('@')[0] || 'Moj Nalog'}</span>
                  </div>
                </Button>
                <Button variant="outline" size="sm" fullWidth onClick={handleSignOut}>
                  Odjavi se
                </Button>
              </div>
            ) : (
              <div className="px-4">
                <Button variant="primary" size="sm" fullWidth onClick={() => scrollToSection('pricing')}>
                  Započni Besplatno
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <DashboardSelectionModal
        isOpen={showDashboardSelection}
        onClose={() => setShowDashboardSelection(false)}
      />
    </nav>
  );
}
