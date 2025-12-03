import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { localAuth } from '../../lib/localStorage';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CreditCard, Calendar, DollarSign, Check, AlertCircle, X } from 'lucide-react';

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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchSubscription();
    }
  }, [isOpen, user]);

  const fetchSubscription = async () => {
    if (!user) return;

    const profile = localAuth.getProfile(user.id);

    if (profile && profile.subscription_tier !== 'free') {
      // Mock subscription object from profile
      const mockSubscription: Subscription = {
        id: `sub-${user.id}`,
        tier: profile.subscription_tier === 'branded-radio' ? 'branded' :
          profile.subscription_tier === 'ad-free' ? 'basic' : 'host',
        status: profile.subscription_status,
        auto_renew: profile.subscription_status === 'active',
        next_billing_date: profile.subscription_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_ends_at: profile.trial_ends_at,
        created_at: profile.created_at,
      };
      setSubscription(mockSubscription);
    } else {
      setSubscription(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const profile = localAuth.getProfile(user.id);
      const isInTrial = profile?.subscription_status === 'trial' &&
        profile?.trial_ends_at &&
        new Date(profile.trial_ends_at) > new Date();

      if (isInTrial) {
        // Mark for cancellation at trial end
        const updated = localAuth.updateProfile(user.id, {
          cancel_at_period_end: true,
        });

        if (!updated) throw new Error('Greška pri otkazivanju pretplate');

        setSuccess('Pretplata će biti otkazana nakon isteka probnog perioda. Nećete biti naplaćeni.');
      } else {
        // Regular subscription cancellation
        const updated = localAuth.updateProfile(user.id, {
          subscription_status: 'cancelled',
          cancel_at_period_end: true,
        });

        if (!updated) throw new Error('Greška pri otkazivanju pretplate');

        setSuccess('Pretplata uspešno otkazana! Vaša pretplata će biti aktivna do kraja billing perioda.');
      }

      setShowCancelConfirm(false);
      fetchSubscription();
    } catch (err: any) {
      setError(err.message || 'Greška pri otkazivanju pretplate');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscription) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updated = localAuth.updateProfile(user.id, {
        subscription_status: 'active',
      });

      if (!updated) throw new Error('Greška pri reaktivaciji pretplate');

      setSuccess('Pretplata uspešno reaktivirana!');
      fetchSubscription();
    } catch (err: any) {
      setError(err.message || 'Greška pri reaktivaciji pretplate');
    } finally {
      setLoading(false);
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'basic':
        return 'BASIC RADIO';
      case 'branded':
        return 'BRANDED RADIO';
      case 'host':
        return 'HOST RADIO';
      default:
        return 'Besplatan';
    }
  };

  const getTierPrice = (tier: string) => {
    switch (tier) {
      case 'basic':
        return '15€';
      case 'branded':
        return '35€';
      case 'host':
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
                      <p className={`font-bold ${subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {subscription.status === 'active' ? 'Aktivna' : 'Otkazana'}
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
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <DollarSign className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Probni period do</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {new Date(subscription.trial_ends_at).toLocaleDateString('sr-RS', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                      <DollarSign className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Automatsko Obnavljanje</p>
                      <p className={`font-bold ${subscription.auto_renew ? 'text-green-600' : 'text-gray-600'}`}>
                        {subscription.auto_renew ? 'Uključeno' : 'Isključeno'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {!showCancelConfirm ? (
              <div className="space-y-3">
                {subscription.status === 'active' ? (
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <X size={20} className="mr-2" />
                    Otkaži Pretplatu
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleReactivateSubscription}
                    disabled={loading}
                  >
                    {loading ? 'Reaktivacija...' : 'Reaktiviraj Pretplatu'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onClick={onClose}
                >
                  Zatvori
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => window.location.href = '/#pricing'}
                >
                  Promeni Paket
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border-2 border-red-500">
                <h4 className="text-lg font-bold text-red-700 dark:text-red-400 mb-3">
                  Da li ste sigurni?
                </h4>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Vaša pretplata će biti otkazana, ali će ostati aktivna do kraja billing perioda ({new Date(subscription.next_billing_date).toLocaleDateString('sr-RS')}). Nećete moći da pristupite premium sadržaju nakon tog datuma.
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={loading}
                  >
                    Ne, Zadrži Pretplatu
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Otkazivanje...' : 'Da, Otkaži'}
                  </Button>
                </div>
              </div>
            )}
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
