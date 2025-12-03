import Hero from '../components/sections/Hero';
import StationsSection from '../components/sections/StationsSection';
import PricingSection from '../components/sections/PricingSection';
import AboutSection from '../components/sections/AboutSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import ContactSection from '../components/sections/ContactSection';
import DashboardPreviewSection from '../components/sections/DashboardPreviewSection';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <AboutSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <StationsSection />
      <PricingSection />
      <ContactSection />
    </>
  );
}
