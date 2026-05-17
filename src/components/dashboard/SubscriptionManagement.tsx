import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CreditCard, Calendar, DollarSign, Check, AlertCircle } from 'lucide-react';

interface SubscriptionManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  auto_renew: boolean;
  next_billing_date: string;
  trial_ends_at: string | null;
  created_at: string;
}

export default function SubscriptionManagement({ isOpen, onClose }: SubscriptionManagementProps) {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [success] = useState('');
  const [error] = useState('');

  useEffect(() => {
    if (isOpen && user && profile) {
      fetchSubscription();
    }
  }, [isOpen, user, profile]);

  const fetchSubscription = async () => {
    if (!user || !profile) return;

    if (profile && profile.subscription_tier !== 'free') {
      let tier: string = profile.subscription_tier;
      // Force trial tier if status is trial, regardless of database tier
      if (profile.subscription_status === 'trial') {
        tier = 'trial';
      } else {
        // Normalize tier names
        if (tier === 'basic-radio' || tier === 'ad-free') tier = 'basic';
        if (tier === 'branded-radio') tier = 'branded';
        if (tier === 'host-radio') tier = 'host';
      }

      let nextBillingDate = profile.subscription_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Handle Trial Display Logic
      if (profile.subscription_status === 'trial') {
        // Determine the most relevant end date we have
        let targetDate = profile.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : (profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

        const now = Date.now();
        const diffDays = (targetDate.getTime() - now) / (1000 * 3600 * 24);

        if (diffDays > 9) {
          if (profile.trial_started_at) {
            targetDate = new Date(new Date(profile.trial_started_at).getTime() + 7 * 24 * 60 * 60 * 1000);
          } else {
            targetDate = new Date(now + 7 * 24 * 60 * 60 * 1000);
          }
        }
        nextBillingDate = targetDate.toISOString();
      }

      const mockSubscription: Subscription = {
        id: `sub-${user.id}`,
        tier: tier,
        status: profile.subscription_status,
        auto_renew: profile.subscription_status === 'active',
        next_billing_date: nextBillingDate,
        trial_ends_at: profile.trial_ends_at || null,
        created_at: profile.created_at || new Date().toISOString(),
      };
      setSubscription(mockSubscription);
    } else {
      setSubscription(null);
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'trial':
        return 'PROBNI PAKET';
      case 'basic':
      case 'basic-radio':
        return 'BASIC RADIO';
      case 'branded':
      case 'branded-radio':
        return 'BRANDED RADIO';
      case 'host':
      case 'host-radio':
        return 'HOST RADIO';
      default:
        return tier.toUpperCase().replace('-', ' ') || 'BESPLATAN';
    }
  };

  const getTierPrice = (tier: string) => {
    switch (tier) {
      case 'trial':
        return '0€';
      case 'basic':
      case 'basic-radio':
        return '15€';
      case 'branded':
      case 'branded-radio':
        return '35€';
      case 'host':
      case 'host-radio':
        return '195€';
      default:
        return '0€';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Moja Pretplata">
      <div className="space-y-6">
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <Check className="text-green-600" size={20} />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        {subscription ? (
          <>
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                      {getTierName(subscription.tier)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Trenutni plan
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-infinity-green-600">
                      {getTierPrice(subscription.tier)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      mesečno
                    </p>
                  </div>
                </div>

                <div className="space-y-3">

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-lg flex items-center justify-center mr-3">
                      <CreditCard className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status Pretplate</p>
                      <p className={`font-bold ${subscription.status === 'active' || subscription.status === 'trial' ? 'text-green-600' : 'text-red-600'}`}>
                        {subscription.status === 'active'
                          ? 'Aktivna'
                          : subscription.status === 'trial'
                            ? 'PROBNI PERIOD (TRIAL)'
                            : 'Otkazana'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {subscription.status === 'active' ? 'Naredna naplata' : 'Ističe'}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {new Date(subscription.next_billing_date).toLocaleDateString('sr-RS', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {subscription.trial_ends_at && (
                    <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <DollarSign className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Probni period aktivan</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          Ističe: {new Date(subscription.trial_ends_at).toLocaleDateString('sr-RS', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="mt-6">
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={onClose}
              >
                Zatvori
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Nemate aktivnu pretplatu.
            </p>
            <Button variant="primary" size="lg" onClick={() => window.location.href = '/#pricing'}>
              Pregledaj Pakete
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
