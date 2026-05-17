import { useEffect } from 'react';
import Hero from '../components/sections/Hero';
import StationsSection from '../components/sections/StationsSection';
import PricingSection from '../components/sections/PricingSection';
import AboutSection from '../components/sections/AboutSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import ContactSection from '../components/sections/ContactSection';
import SubscriptionOptionsSection from '../components/sections/SubscriptionOptionsSection';
import { useIsStandalone } from '../hooks/useIsStandalone';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import PWAAuthView from '../components/auth/PWAAuthView';
import { Navigate } from 'react-router-dom';

export default function LandingPage() {
  const isStandalone = useIsStandalone();
  const { user, loading } = useAuth();
  const { pause, isPlaying } = useAudio();

  useEffect(() => {
    if (isPlaying) pause();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;

  // If in PWA (standalone)
  if (isStandalone) {
    if (!user) {
      // Show only Auth view if not logged in
      return <PWAAuthView />;
    } else {
      // Redirect to dashboard if logged in - no landing page allowed in PWA
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <>
      <Hero />
      <AboutSection />
      <HowItWorksSection />
      {/* <DashboardPreviewSection /> removed as per user request */}
      <StationsSection />
      <PricingSection />
      <SubscriptionOptionsSection />
      <ContactSection />
    </>
  );
}
