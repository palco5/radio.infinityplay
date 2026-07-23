import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AudioProvider } from './contexts/AudioContext';
import { useAudio } from './contexts/AudioContext';
import { SongPlayerProvider } from './contexts/SongPlayerContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AudioPlayer from './components/player/AudioPlayer';
import PageLoadAnimation from './components/ui/PageLoadAnimation';
import LandingPage from './pages/LandingPage';
import PaymentPage from './pages/PaymentPage';
import SubscriptionOptionsPage from './pages/SubscriptionOptionsPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import ProtectedRoute from './components/routing/ProtectedRoute';
import CookieConsent from './components/ui/CookieConsent';

import { useIsStandalone } from './hooks/useIsStandalone';

function AppContent() {
  const location = useLocation();
  const isStandalone = useIsStandalone();
  const { currentStation, pause } = useAudio();
  const isUserDashboard = location.pathname === '/dashboard';
  const isAdmin = location.pathname === '/admin';
  const isHome = location.pathname === '/';
  const isDashboard = isUserDashboard || isAdmin;
  const [showAnimation, setShowAnimation] = useState(true);

  // Stop radio when navigating away from user dashboard (to admin or home)
  useEffect(() => {
    if (isAdmin || isHome) {
      pause();
    }
  }, [location.pathname]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  // Hide Navbar/Footer if on dashboard OR if running in PWA standalone mode
  const shouldHideLayout = isDashboard || isStandalone;

  return (
    <>
      {showAnimation && <PageLoadAnimation onComplete={handleAnimationComplete} />}
      <div className="min-h-screen bg-white dark:bg-infinity-dark-900 transition-colors duration-300 smooth-scroll">
        {!shouldHideLayout && <Navbar />}
        <main className={isUserDashboard && currentStation ? 'pb-28' : ''}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription-options"
              element={
                <ProtectedRoute>
                  <SubscriptionOptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin adminEmail="darkospira@gmail.com">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        {!shouldHideLayout && <Footer />}
        {isUserDashboard && <AudioPlayer />}
        {!isDashboard && <CookieConsent />}
      </div>
    </>
  );
}

import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Došlo je do greške!</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Aplikacija je naišla na neočekivanu grešku. Molimo osvežite stranicu.
            </p>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60 mb-4">
              <code className="text-sm text-red-500 font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Osveži stranicu
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <ThemeProvider>
            <AudioProvider>
              <SongPlayerProvider>
                <AppContent />
              </SongPlayerProvider>
            </AudioProvider>
          </ThemeProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
