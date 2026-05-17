import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { profiles as profilesApi } from '../../lib/api';
import TrialConfetti from './TrialConfetti';
import TrialTimer from './TrialTimer';
import { Crown, Check } from 'lucide-react';
import { TrialUIConfig } from '../../types';

interface TrialUIWrapperProps {
  children: React.ReactNode;
}

const defaultTrialConfig: TrialUIConfig = {
  id: 'default-trial-ui',
  background_color: '#0f172a',
  background_gradient_start: '#1e1b4b',
  background_gradient_end: '#312e81',
  primary_color: '#6366f1',
  secondary_color: '#a855f7',
  accent_color: '#fbbf24',
  welcome_message: '🎉 Dobrodošli u vaš 7-dnevni probni period!',
  trial_badge_text: 'PROBNI PERIOD',
  features_enabled: ['unlimited_stations', 'no_ads', 'hd_quality', 'custom_playlists'],
  show_confetti: true,
  show_timer: true,
  custom_css: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const TrialUIWrapper: React.FC<TrialUIWrapperProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);
  const [trialConfig, setTrialConfig] = useState<TrialUIConfig>(defaultTrialConfig);
  const [isTrialActive, setIsTrialActive] = useState(false);

  useEffect(() => {
    if (user && profile) {
      // Admin users should never see trial UI
      if (profile.is_admin) {
        setIsTrialActive(false);
        return;
      }

      // Check if user is in trial period
      const isTrial = profile.subscription_status === 'trial' &&
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) > new Date();

      setIsTrialActive(!!isTrial);

      if (isTrial) {
        // Load custom trial UI config or use default
        const config = profile.trial_ui_config || defaultTrialConfig;
        setTrialConfig(config);

        // Show confetti if enabled and not shown before
        if (config.show_confetti && !profile.confetti_shown) {
          setShowConfetti(true);
          // Mark confetti as shown
          profilesApi.update(user.id, { confetti_shown: true });
        }
      }
    }
  }, [user, profile]);

  const handleTrialExpired = async () => {
    if (user && profile) {
      if (!profile.cancel_at_period_end) {
        // Auto-charge and convert to paid subscription
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

        await profilesApi.update(user.id, {
          subscription_status: 'active',
          subscription_ends_at: subscriptionEndsAt.toISOString(),
          trial_ends_at: null,
        });

        alert('Vaš probni period je istekao. Pretplata je automatski aktivirana na 30 dana.');
      } else {
        // Trial expired and user cancelled
        await profilesApi.update(user.id, {
          subscription_status: 'inactive',
          subscription_tier: 'free',
          trial_ends_at: null,
        });

        alert('Vaš probni period je istekao. Pretplatite se ponovo da nastavite.');
      }
    }
  };

  if (!isTrialActive) {
    return <>{children}</>;
  }

  const featureLabels: Record<string, string> = {
    unlimited_stations: 'Neograničene stanice',
    no_ads: 'Bez reklama',
    hd_quality: 'HD kvalitet',
    offline_mode: 'Offline režim',
    custom_playlists: 'Prilagođene plejliste',
    priority_support: 'Prioritetna podrška',
  };

  return (
    <div
      className="trial-ui-wrapper"
      style={{
        background: `linear-gradient(135deg, ${trialConfig.background_gradient_start}, ${trialConfig.background_gradient_end})`,
      }}
    >
      {showConfetti && <TrialConfetti duration={5000} />}

      <div className="trial-ui-header">
        <div className="trial-badge" style={{ backgroundColor: trialConfig.primary_color }}>
          <Crown size={16} />
          {trialConfig.trial_badge_text}
        </div>

        <h1 className="trial-welcome" style={{ color: trialConfig.accent_color }}>
          {trialConfig.welcome_message}
        </h1>

        <div className="trial-features">
          {trialConfig.features_enabled.map(feature => (
            <div
              key={feature}
              className="trial-feature"
              style={{ borderColor: trialConfig.secondary_color }}
            >
              <Check size={16} style={{ color: trialConfig.primary_color }} />
              <span>{featureLabels[feature] || feature}</span>
            </div>
          ))}
        </div>


        {trialConfig.show_timer && user && profile && (
          <TrialTimer
            trialEndsAt={profile.trial_ends_at || ''}
            onExpired={handleTrialExpired}
          />
        )}
      </div>

      <div className="trial-ui-content">
        {children}
      </div>

      {trialConfig.custom_css && (
        <style>{trialConfig.custom_css}</style>
      )}

      <style>{`
        .trial-ui-wrapper {
          min-height: 100vh;
          padding: 20px;
        }

        .trial-ui-header {
          max-width: 1200px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .trial-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 20px;
          animation: badge-pulse 2s ease-in-out infinite;
        }

        @keyframes badge-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .trial-welcome {
          font-size: 32px;
          font-weight: 800;
          margin: 0 0 30px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .trial-features {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-bottom: 30px;
        }

        .trial-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 2px solid;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .trial-feature:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.15);
        }

        .trial-ui-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .trial-welcome {
            font-size: 24px;
          }

          .trial-features {
            flex-direction: column;
            align-items: center;
          }

          .trial-feature {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default TrialUIWrapper;
