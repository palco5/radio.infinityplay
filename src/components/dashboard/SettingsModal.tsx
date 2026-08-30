import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { profiles as profilesApi, auth as authApi, billing as billingApi, polar as polarApi, type BillingPortalState } from '../../lib/api';
import { MERCHANT_OF_RECORD } from '../../lib/plans';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  Moon, Sun, Mail, Bell, Check, AlertCircle, User, Lock, CreditCard,
  AlertTriangle, Calendar, Trash2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabId;
}

type TabId = 'account' | 'security' | 'billing' | 'notifications' | 'danger';

const avatarOptions = [
  '😀', '😎', '🥳', '🤓', '😇',
  '🦸', '🦹', '🧙', '🧚', '🧛',
  '🐶', '🐱', '🐭', '🐹', '🐰',
  '🦊', '🐻', '🐼', '🐨', '🐯',
];

const TIER_LABELS: Record<string, string> = {
  'basic-radio': 'BASIC RADIO',
  'branded-radio': 'BRANDED RADIO',
  'host-radio': 'HOST RADIO',
  free: 'BESPLATAN',
  none: 'BESPLATAN',
};

const TIER_PRICES: Record<string, string> = {
  'basic-radio': '15€ / mesečno',
  'branded-radio': '35€ / mesečno',
  'host-radio': '195€ / godišnje',
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  paid:       { label: 'Plaćeno',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  sent:       { label: 'Poslato',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  sef_failed: { label: 'Poslato',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  draft:      { label: 'U pripremi', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  canceled:   { label: 'Otkazano',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export default function SettingsModal({ isOpen, onClose, initialTab = 'account' }: SettingsModalProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'account', label: 'Nalog', icon: User },
    { id: 'security', label: 'Bezbednost', icon: Lock },
    { id: 'billing', label: 'Pretplata i naplata', icon: CreditCard },
    { id: 'notifications', label: 'Notifikacije', icon: Bell },
    { id: 'danger', label: 'Opasna zona', icon: AlertTriangle },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Podešavanja" size="xl">
      <div className="flex flex-col md:flex-row gap-6 -m-6 md:m-0 md:min-h-[28rem]">
        <div className="flex md:flex-col overflow-x-auto md:overflow-visible md:w-56 md:flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 px-2 md:px-0 md:pr-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === 'danger';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors md:w-full text-left ${isActive
                  ? isDanger
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-700 dark:text-infinity-green-400'
                  : isDanger
                    ? 'text-red-500 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-900/10'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-infinity-dark-700'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0 px-6 md:px-0 pb-6 md:pb-0">
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'billing' && <BillingTab onManageInAccountTab={() => setActiveTab('account')} />}
          {activeTab === 'notifications' && (
            <NotificationsTab theme={theme} toggleTheme={toggleTheme} onClose={onClose} />
          )}
          {activeTab === 'danger' && <DangerZoneTab onClose={onClose} signOut={signOut} />}
        </div>
      </div>
    </Modal>
  );

  // ── Nalog ──────────────────────────────────────────────────────────────
  function AccountTab() {
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [venueName, setVenueName] = useState(profile?.venue_name || '');
    const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || '😀');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      setDisplayName(profile?.display_name || '');
      setVenueName(profile?.venue_name || '');
      setSelectedAvatar(profile?.avatar_url || '😀');
    }, [profile]);

    const handleSave = async () => {
      if (!user) return;
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await profilesApi.update(user.id, {
          display_name: displayName,
          venue_name: venueName,
          avatar_url: selectedAvatar,
        });
        await refreshProfile();
        setSuccess('Nalog je uspešno ažuriran!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message || 'Greška pri ažuriranju naloga');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nalog</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Osnovni podaci o tebi i tvom lokalu.</p>
        </div>

        <FeedbackBanners success={success} error={error} />

        <Input
          label="Ime lokala"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder="npr. Kafić Central"
        />

        <Input
          label="Nadimak"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Unesite vaš nadimak"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Avatar</label>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`aspect-square text-2xl flex items-center justify-center rounded-xl transition-all ${selectedAvatar === avatar
                  ? 'bg-gradient-infinity shadow-glow-green scale-110 ring-2 ring-infinity-green-500'
                  : 'bg-gray-100 dark:bg-infinity-dark-700 hover:scale-105'
                  }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-infinity-dark-800 p-4 rounded-2xl">
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Email:</strong> {user?.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email se ne može promeniti</p>
        </div>

        <Button variant="primary" size="lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Čuvanje...' : 'Sačuvaj izmene'}
        </Button>
      </div>
    );
  }

  // ── Bezbednost ─────────────────────────────────────────────────────────
  function SecurityTab() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
      setError('');
      setSuccess('');

      if (newPassword.length < 8) {
        setError('Nova lozinka mora imati bar 8 karaktera');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Nova lozinka i potvrda se ne poklapaju');
        return;
      }

      setLoading(true);
      try {
        await authApi.changePassword(currentPassword, newPassword);
        setSuccess('Lozinka je uspešno promenjena!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message || 'Greška pri promeni lozinke');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bezbednost</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Promeni lozinku svog naloga.</p>
        </div>

        <FeedbackBanners success={success} error={error} />

        <Input
          type="password"
          label="Trenutna lozinka"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          type="password"
          label="Nova lozinka"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          type="password"
          label="Potvrdi novu lozinku"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <Button
          variant="primary"
          size="lg"
          onClick={handleChangePassword}
          disabled={loading || !currentPassword || !newPassword}
        >
          {loading ? 'Menjanje...' : 'Promeni lozinku'}
        </Button>
      </div>
    );
  }

  // ── Pretplata i naplata ───────────────────────────────────────────────
  function BillingTab({ onManageInAccountTab: _unused }: { onManageInAccountTab: () => void }) {
    const [canceling, setCanceling] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [portal, setPortal] = useState<BillingPortalState | null>(null);

    // Učitaj billing stanje (tip pretplate, sledeći datum, istorija faktura).
    useEffect(() => {
      let alive = true;
      billingApi.getPortal().then((p) => { if (alive) setPortal(p); }).catch(() => {});
      return () => { alive = false; };
    }, []);

    const tier = profile?.subscription_tier || 'none';
    const status = profile?.subscription_status || 'inactive';
    const hasActivePlan = status !== 'inactive' && tier !== 'none' && tier !== 'free';
    const subState = portal?.subscription?.state;
    const isFaktura = portal?.subscription?.payment_method === 'faktura';
    const isCard = portal?.subscription?.payment_method === 'card';
    const isCanceling = subState === 'canceling' || !!profile?.cancel_at_period_end;

    // Otvara Polar Customer Portal (izmena/brisanje kartice, način plaćanja,
    // fakture) — sve na Polarovoj PCI-bezbednoj strani, kao Claude→Stripe.
    const handleManagePayment = async () => {
      setError('');
      setPortalLoading(true);
      try {
        const { url } = await polarApi.portal();
        window.location.href = url; // vraća se na /dashboard preko return_url
      } catch (err: any) {
        setError(err?.message || 'Ne mogu da otvorim upravljanje plaćanjem.');
        setPortalLoading(false);
      }
    };

    // Nov korisnik (bez aktivne kartične pretplate): izbor paketa ide kroz
    // /pretplata -> /checkout. Aktivan kartični pretplatnik NE sme kroz novi
    // checkout (Polar blokira "already have subscription") — promena plana ide
    // kroz Polar portal (proration), kao Claude→Stripe.
    const handleUpgrade = (planKey: 'basic' | 'branded' | 'host') => {
      if (isCard) { handleManagePayment(); return; }
      const planId = { basic: 'basic-radio', branded: 'branded-radio', host: 'host-radio' }[planKey];
      onClose();
      navigate(`/pretplata?plan=${planId}`);
    };

    // Otkazivanje radi za OBA načina (faktura + kartica) kroz isti endpoint.
    const handleCancel = async () => {
      setError('');
      setSuccess('');
      setCanceling(true);
      try {
        const r = await billingApi.cancel();
        const until = r.access_until
          ? new Date(r.access_until.replace(' ', 'T')).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;
        setSuccess(until ? `Pretplata je otkazana. Pristup imate do ${until}.` : (r.message || 'Pretplata je otkazana.'));
        await refreshProfile();
        billingApi.getPortal().then(setPortal).catch(() => {});
      } catch (err: any) {
        setError(err.message || 'Greška pri otkazivanju pretplate');
      } finally {
        setCanceling(false);
      }
    };

    // Reaktivacija u toku perioda; ako je period istekao, vodi na checkout.
    const handleReactivate = async () => {
      setError('');
      setSuccess('');
      setReactivating(true);
      try {
        await billingApi.reactivate();
        setSuccess('Pretplata je ponovo aktivna.');
        await refreshProfile();
        billingApi.getPortal().then(setPortal).catch(() => {});
      } catch (err: any) {
        if (err?.data?.needs_checkout) {
          window.location.href = `/checkout?plan=${portal?.subscription?.plan || 'branded-radio'}`;
          return;
        }
        setError(err.message || 'Reaktivacija trenutno nije moguća');
      } finally {
        setReactivating(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pretplata i naplata</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upravljaj svojim planom i plaćanjem.</p>
        </div>

        <FeedbackBanners success={success} error={error} />

        {hasActivePlan ? (
          <div className="bg-gray-50 dark:bg-infinity-dark-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
                  {status === 'trial' ? 'PROBNI PERIOD' : (TIER_LABELS[tier] || tier.toUpperCase())}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Trenutni plan</p>
              </div>
              {TIER_PRICES[tier] && (
                <p className="text-sm font-bold text-infinity-green-600">{TIER_PRICES[tier]}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-white" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className={`font-bold ${profile?.cancel_at_period_end ? 'text-orange-500' : 'text-green-600'}`}>
                  {profile?.cancel_at_period_end
                    ? 'Aktivna — otkazana, ne obnavlja se'
                    : status === 'trial' ? 'Probni period' : 'Aktivna'}
                </p>
              </div>
            </div>

            {profile?.subscription_ends_at && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="text-white" size={18} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile?.cancel_at_period_end ? 'Pristup ističe' : 'Naredna naplata'}
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {new Date(profile.subscription_ends_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* Tip pretplate */}
            {portal?.subscription && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="text-white" size={18} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Način plaćanja</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {isFaktura ? 'Plaćanje po fakturi' : 'Kartica'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {isCard && (
                <Button variant="primary" size="md" onClick={handleManagePayment} disabled={portalLoading}>
                  {portalLoading ? 'Otvaranje…' : 'Upravljaj karticom i plaćanjem'}
                </Button>
              )}
              {isCanceling ? (
                <Button variant={isCard ? 'outline' : 'primary'} size="md" onClick={handleReactivate} disabled={reactivating}>
                  {reactivating ? 'Reaktivacija...' : 'Ponovo aktiviraj'}
                </Button>
              ) : (
                status !== 'trial' && (
                  <Button variant="outline" size="md" onClick={handleCancel} disabled={canceling}>
                    {canceling ? 'Otkazivanje...' : 'Otkaži pretplatu'}
                  </Button>
                )
              )}
            </div>

            {isCard && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Promena plana, izmena kartice, način plaćanja i fakture — bezbedno na {MERCHANT_OF_RECORD.name} portalu.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-infinity-dark-800 rounded-2xl p-5">
            <p className="text-gray-600 dark:text-gray-400 mb-1">Nemaš aktivnu pretplatu.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Izaberi plan ispod da nastaviš.</p>
          </div>
        )}

        {/* Kartični pretplatnik menja plan kroz Polar portal (dugme iznad), a ne
            kroz novi checkout — pa ove kartice prikazujemo samo onima koji tek
            biraju plan (trial/istekli/faktura). */}
        {!isCard && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              {hasActivePlan ? 'Promeni plan' : 'Dostupni planovi'}
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              {(['basic', 'branded', 'host'] as const).map((planKey) => {
                const label = { basic: 'Basic Radio', branded: 'Branded Radio', host: 'Host Radio' }[planKey];
                const price = { basic: '15€/mes', branded: '35€/mes', host: '195€/god' }[planKey];
                return (
                  <button
                    key={planKey}
                    onClick={() => handleUpgrade(planKey)}
                    className="text-left p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-infinity-green-500 transition-colors"
                  >
                    <p className="font-bold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{price}</p>
                    <p className="text-xs text-infinity-green-600 mt-2">Izaberi →</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Istorija faktura (samo za plaćanje po fakturi) */}
        {portal && portal.invoices.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Istorija faktura
            </h4>
            <div className="bg-gray-50 dark:bg-infinity-dark-800 rounded-2xl divide-y divide-gray-200 dark:divide-infinity-dark-700">
              {portal.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{inv.broj_fakture}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(inv.datum.replace(' ', 'T')).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}
                      {Number(inv.ukupno).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {inv.valuta}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${INVOICE_STATUS[inv.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {INVOICE_STATUS[inv.status]?.label || inv.status}
                    </span>
                    <a
                      href={billingApi.invoiceUrl(inv.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-infinity-green-600 hover:underline"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Kartično plaćanje obrađuje {MERCHANT_OF_RECORD.name} — pogledaj našu{' '}
          <a href="/refund-policy" className="underline hover:text-infinity-green-500">Politiku povraćaja novca</a>.
          {' '}Za e-fakturu na SEF izaberite plaćanje po fakturi.
        </p>
      </div>
    );
  }

  // ── Notifikacije ───────────────────────────────────────────────────────
  function NotificationsTab({ theme, toggleTheme }: { theme: string; toggleTheme: () => void; onClose: () => void }) {
    const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);
    const [newsletterSubscription, setNewsletterSubscription] = useState(profile?.newsletter_subscribed ?? false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      setEmailNotifications(profile?.email_notifications ?? true);
      setNewsletterSubscription(profile?.newsletter_subscribed ?? false);
    }, [profile]);

    const handleSave = async () => {
      if (!user) return;
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await profilesApi.update(user.id, {
          email_notifications: emailNotifications,
          newsletter_subscribed: newsletterSubscription,
        });
        await refreshProfile();
        setSuccess('Podešavanja su sačuvana!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message || 'Greška pri čuvanju podešavanja');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notifikacije i izgled</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kako želiš da izgleda i obaveštava te platforma.</p>
        </div>

        <FeedbackBanners success={success} error={error} />

        <ToggleRow
          icon={theme === 'dark' ? <Moon className="text-infinity-green-500" size={22} /> : <Sun className="text-infinity-green-600" size={22} />}
          title="Tema"
          description={`${theme === 'dark' ? 'Tamna' : 'Svetla'} tema`}
          checked={theme === 'dark'}
          onToggle={toggleTheme}
        />
        <ToggleRow
          icon={<Bell className="text-blue-600" size={22} />}
          title="Email notifikacije"
          description="Primaj notifikacije o novostima"
          checked={emailNotifications}
          onToggle={() => setEmailNotifications((v) => !v)}
        />
        <ToggleRow
          icon={<Mail className="text-orange-600" size={22} />}
          title="Newsletter"
          description="Primaj newsletter i promocije"
          checked={newsletterSubscription}
          onToggle={() => setNewsletterSubscription((v) => !v)}
        />

        <Button variant="primary" size="lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Čuvanje...' : 'Sačuvaj'}
        </Button>
      </div>
    );
  }

  // ── Opasna zona ────────────────────────────────────────────────────────
  function DangerZoneTab({ onClose, signOut }: { onClose: () => void; signOut: () => void | Promise<void> }) {
    const [confirming, setConfirming] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
      setError('');
      setLoading(true);
      try {
        await authApi.deleteAccount(password);
        onClose();
        await signOut();
      } catch (err: any) {
        setError(err.message || 'Greška pri brisanju naloga');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Opasna zona</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ove akcije su trajne i ne mogu se poništiti.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div className="border-2 border-red-200 dark:border-red-900/40 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Obriši nalog</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Trajno brisanje naloga, profila, favorita i istorije slušanja. Aktivna pretplata neće biti automatski
                otkazana kod {MERCHANT_OF_RECORD.name}-a — otkaži je pre brisanja naloga u sekciji "Pretplata i naplata".
              </p>
            </div>
          </div>

          {!confirming ? (
            <Button variant="outline" size="md" onClick={() => setConfirming(true)}>
              Obriši nalog
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                type="password"
                label="Unesi lozinku da potvrdiš"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="flex gap-3">
                <Button variant="ghost" size="md" onClick={() => { setConfirming(false); setPassword(''); }}>
                  Otkaži
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleDelete}
                  disabled={loading || !password}
                  className="!bg-red-600 hover:!bg-red-700"
                >
                  {loading ? 'Brisanje...' : 'Da, trajno obriši moj nalog'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

function FeedbackBanners({ success, error }: { success: string; error: string }) {
  return (
    <>
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
          <Check className="text-green-600 flex-shrink-0" size={20} />
          <span className="text-green-700 dark:text-green-400 text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}
    </>
  );
}

function ToggleRow({ icon, title, description, checked, onToggle }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-gray-50 dark:bg-infinity-dark-800 p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-infinity-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}
