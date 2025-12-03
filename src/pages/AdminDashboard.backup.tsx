import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { localAuth, localStations } from '../lib/localStorage';
import { eventBus, EVENTS, useEventBus } from '../lib/eventBus';
import { RadioStation, UserProfile } from '../types';
import {
  LayoutDashboard,
  Radio,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Activity,
  Eye,
  Search,
  Filter,
  Ban,
  UserCog,
  Mail
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AddStationModal from '../components/admin/AddStationModal';
import EditStationModal from '../components/admin/EditStationModal';

type AdminView = 'overview' | 'stations' | 'users' | 'subscriptions' | 'analytics' | 'settings';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalStations: number;
  monthlyRevenue: number;
  trialUsers: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalStations: 0,
    monthlyRevenue: 0,
    trialUsers: 0,
  });
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStation, setShowAddStation] = useState(false);
  const [showEditStation, setShowEditStation] = useState(false);
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterCategory, setUserFilterCategory] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [businessCategories, setBusinessCategories] = useState<any[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [listenerCounts, setListenerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.email !== 'darkospira@gmail.com') {
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
    fetchBusinessCategories();
    subscribeToListenerCounts();

    return () => {
      if ((window as any).listenerCountsChannel) {
        supabase.removeChannel((window as any).listenerCountsChannel);
      }
    };
  }, [user, navigate]);

  useEffect(() => {
    filterUsers();
  }, [userSearchQuery, userFilterCategory, users]);

  const fetchBusinessCategories = async () => {
    const { data } = await supabase
      .from('business_categories')
      .select('*')
      .order('sort_order');

    if (data) {
      setBusinessCategories(data);
    }
  };

  const subscribeToListenerCounts = () => {
    fetchListenerCounts();

    const interval = setInterval(() => {
      fetchListenerCounts();
    }, 5000);

    const channel = supabase
      .channel('active_listeners_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_listeners'
        },
        () => {
          fetchListenerCounts();
        }
      )
      .subscribe();

    (window as any).listenerCountsChannel = channel;
    (window as any).listenerCountsInterval = interval;

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  };

  const fetchListenerCounts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_stations_listener_counts');

      if (error) {
        console.error('Error fetching listener counts:', error);
        return;
      }

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((item: any) => {
          counts[item.station_id] = item.listener_count;
        });
        setListenerCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch listener counts:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [usersData, stationsData, subscriptionsData, trialsData, paymentsData] = await Promise.all([
        supabase.from('users_profiles').select('*', { count: 'exact' }),
        supabase.from('radio_stations').select('*', { count: 'exact' }),
        supabase.from('subscriptions').select('*').eq('status', 'active'),
        supabase.from('trial_periods').select('*').eq('is_active', true),
        supabase.from('payment_transactions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      const revenue = paymentsData.data?.reduce((sum, payment) =>
        payment.status === 'completed' ? sum + (payment.amount_cents / 100) : sum, 0) || 0;

      setStats({
        totalUsers: usersData.count || 0,
        activeSubscriptions: subscriptionsData.data?.length || 0,
        totalStations: stationsData.count || 0,
        monthlyRevenue: revenue,
        trialUsers: trialsData.data?.length || 0,
      });

      if (stationsData.data) setStations(stationsData.data);
      if (usersData.data) setUsers(usersData.data);
      if (paymentsData.data) setPayments(paymentsData.data);

      await fetchAnalytics();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: stationAnalytics } = await supabase
        .from('station_analytics')
        .select('*, radio_stations(name, genre)')
        .order('total_listeners', { ascending: false })
        .limit(10);

      const { data: dailyAnalytics } = await supabase
        .from('analytics_daily')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      setAnalytics({
        topStations: stationAnalytics || [],
        dailyData: dailyAnalytics || [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (userSearchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    }

    if (userFilterCategory !== 'all') {
      filtered = filtered.filter(user => user.business_category === userFilterCategory);
    }

    setFilteredUsers(filtered);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu stanicu?')) return;

    const { error } = await supabase
      .from('radio_stations')
      .delete()
      .eq('id', stationId);

    if (!error) {
      fetchDashboardData();
    }
  };

  const handleToggleStationStatus = async (stationId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('radio_stations')
      .update({ is_active: !currentStatus })
      .eq('id', stationId);

    if (!error) {
      fetchDashboardData();
    }
  };

  const handleEditStation = (station: RadioStation) => {
    setSelectedStation(station);
    setShowEditStation(true);
  };

  const handleToggleUserAccess = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const { error } = await supabase
      .from('users_profiles')
      .update({ subscription_status: newStatus })
      .eq('id', userId);

    if (!error) {
      fetchDashboardData();
    }
  };

  const handleAddAdmin = async (email: string) => {
    const { data: userData } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!userData) {
      alert('Korisnik sa ovim emailom nije pronađen');
      return;
    }

    const { error } = await supabase
      .from('users_profiles')
      .update({ is_admin: true, admin_level: 1 })
      .eq('id', userData.id);

    if (!error) {
      alert('Admin privilegije su dodeljene uspešno!');
      fetchDashboardData();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ukupno Korisnika</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
          </div>
          {/* TODO: Implementirati real-time statistike nakon prelaska na produkciju */}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aktivne Pretplate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSubscriptions}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-xl flex items-center justify-center">
              <CreditCard className="text-white" size={24} />
            </div>
          </div>
          {/* TODO: Implementirati real-time statistike nakon prelaska na produkciju */}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Probni Periodi</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.trialUsers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Aktivnih probnih perioda
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Radio Stanice</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStations}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
              <Radio className="text-white" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Activity size={16} className="mr-1" />
            <span>{stations.filter(s => s.is_active).length} aktivnih</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ukupan Prihod</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">€{stats.monthlyRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
          {/* TODO: Implementirati real-time statistike nakon prelaska na produkciju */}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Najslušanije Stanice
          </h3>
          <div className="space-y-3">
            {stations.slice(0, 5).map((station, index) => (
              <div key={station.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-infinity rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{station.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{station.genre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {listenerCounts[station.id] > 0 && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    <p className="font-bold text-gray-900 dark:text-white">{listenerCounts[station.id] || 0}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">slušalaca</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Nedavne Aktivnosti
          </h3>
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Aktivnosti će biti prikazane nakon produkcijskog deploy-a
            </p>
            {/* TODO: Real-time activity log nakon produkcije */}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderStations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
          Upravljanje Stanicama
        </h2>
        <Button variant="primary" onClick={() => setShowAddStation(true)}>
          <Plus size={20} className="mr-2" />
          Nova Stanica
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Naziv</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Žanr</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Slušalaca</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => (
                <tr key={station.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-infinity-dark-700">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 dark:text-white">{station.name}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{station.genre}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {listenerCounts[station.id] > 0 && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                      <span className="text-gray-600 dark:text-gray-400">{listenerCounts[station.id] || 0}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStationStatus(station.id, station.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${station.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                    >
                      {station.is_active ? 'Aktivna' : 'Neaktivna'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditStation(station)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-600 rounded-lg transition-colors"
                      >
                        <Edit className="text-blue-600" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteStation(station.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="text-red-600" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
        Upravljanje Korisnicima
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pretraži korisnike..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          <select
            value={userFilterCategory}
            onChange={(e) => setUserFilterCategory(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none appearance-none cursor-pointer"
          >
            <option value="all">Sve kategorije</option>
            {businessCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.display_name_sr}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Korisnik</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Kategorija</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 50).map((user) => {
                const category = businessCategories.find(c => c.name === user.business_category);
                return (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-infinity-dark-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {user.avatar_url && <span className="text-xl">{user.avatar_url}</span>}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.display_name || 'N/A'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {category ? `${category.icon} ${category.display_name_sr}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-infinity-green-100 dark:bg-infinity-green-900/30 text-infinity-green-700 dark:text-infinity-green-400 rounded-full text-xs font-medium uppercase">
                        {user.subscription_tier || 'free'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleUserAccess(user.id, user.subscription_status)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscription_status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                      >
                        {user.subscription_status === 'active' ? 'Aktivan' : 'Neaktivan'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => { }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-600 rounded-lg transition-colors"
                          title="Pregledaj detalje"
                        >
                          <Eye className="text-gray-600 dark:text-gray-400" size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleUserAccess(user.id, user.subscription_status)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={user.subscription_status === 'active' ? 'Deaktiviraj pristup' : 'Aktiviraj pristup'}
                        >
                          <Ban className="text-red-600" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
        Upravljanje Pretplatama
      </h2>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Nedavne Transakcije
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Datum</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Korisnik</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Iznos</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Tip</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {new Date(payment.created_at).toLocaleDateString('sr-RS')}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {payment.user_id}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    €{(payment.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {payment.transaction_type}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
          Analitika
        </h2>
        <div className="flex items-center space-x-3">
          <Filter className="text-gray-400" size={20} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
          >
            <option value="all">Sve kategorije</option>
            {businessCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.display_name_sr}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Top 10 Najslušanijih Stanica
          </h3>
          <div className="space-y-3">
            {analytics?.topStations?.slice(0, 10).map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-infinity rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.radio_stations?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.radio_stations?.genre || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{item.total_listeners}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">slušalaca</p>
                </div>
              </div>
            )) || (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  Nema dostupnih podataka
                </p>
              )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Slušanost Po Kategorijama
          </h3>
          <div className="space-y-3">
            {businessCategories.slice(0, 8).map((category) => {
              const categoryUsers = users.filter(u => u.business_category === category.name);
              const percentage = users.length > 0 ? (categoryUsers.length / users.length * 100).toFixed(1) : 0;

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {category.icon} {category.display_name_sr}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {categoryUsers.length} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-infinity h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Detaljna Lista Objekata
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Ukupno: {categoryFilter === 'all' ? users.length : users.filter(u => u.business_category === categoryFilter).length} objekata
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Naziv/Nadimak</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Vlasnik</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Kategorija</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Kontakt</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Registrovan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Slušanje (min)</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {(categoryFilter === 'all' ? users : users.filter(u => u.business_category === categoryFilter))
                .sort((a, b) => (b.total_listening_minutes || 0) - (a.total_listening_minutes || 0))
                .slice(0, 50)
                .map((user) => {
                  const category = businessCategories.find(c => c.name === user.business_category);
                  const fullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'N/A';
                  const phoneDisplay = user.phone_number ? `${user.country_code || '+381'} ${user.phone_number}` : 'N/A';

                  return (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-infinity-dark-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {user.avatar_url && <span className="text-xl">{user.avatar_url}</span>}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.display_name || 'Bez nadimka'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900 dark:text-white">{fullName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {category ? `${category.icon} ${category.display_name_sr}` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{phoneDisplay}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('sr-RS')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="text-infinity-green-600" size={16} />
                          <span className="font-medium text-gray-900 dark:text-white">{user.total_listening_minutes || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscription_status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                          {user.subscription_tier || 'free'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
        Podešavanja
      </h2>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          <UserCog className="inline mr-2" size={20} />
          Upravljanje Admin Korisnicima
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Dodajte nove administratore unošenjem njihove email adrese
        </p>
        <div className="flex space-x-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="email@primer.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (adminEmail) {
                handleAddAdmin(adminEmail);
                setAdminEmail('');
              }
            }}
          >
            Dodaj Admina
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Sistemska Podešavanja
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Trajanje probnog perioda</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Podrazumevano trajanje besplatnog perioda</p>
            </div>
            <input
              type="number"
              defaultValue={7}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email notifikacije</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Šalji email korisnicima pri važnim događajima</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Automatsko obnavljanje pretplata</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Omogući automatsko obnavljanje po default-u</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          PayPal Integracija
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PayPal Client ID
            </label>
            <input
              type="text"
              placeholder="AXXXXXXXXXXXXXXXx"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PayPal Secret Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
            />
          </div>
          <Button variant="primary" fullWidth>
            Sačuvaj PayPal Podešavanja
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Učitavanje...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'overview':
        return renderOverview();
      case 'stations':
        return renderStations();
      case 'users':
        return renderUsers();
      case 'subscriptions':
        return renderSubscriptions();
      case 'analytics':
        return renderAnalytics();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 transition-colors flex">
      <aside className="w-64 bg-white dark:bg-infinity-dark-800 border-r border-gray-200 dark:border-gray-700 fixed h-full overflow-y-auto">
        <div className="p-6">
          <img src="/logo.png" alt="InfinityPlay" className="h-10 w-auto mb-6" />
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-4">
            Admin Panel
          </p>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Pregled', icon: LayoutDashboard },
              { id: 'stations', label: 'Stanice', icon: Radio },
              { id: 'users', label: 'Korisnici', icon: Users },
              { id: 'subscriptions', label: 'Pretplate', icon: CreditCard },
              { id: 'analytics', label: 'Analitika', icon: BarChart3 },
              { id: 'settings', label: 'Podešavanja', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as AdminView)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === item.id
                    ? 'bg-infinity-green-100 dark:bg-infinity-green-900/30 text-infinity-green-700 dark:text-infinity-green-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-infinity-dark-700'
                  }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-white dark:bg-infinity-dark-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
                {currentView === 'overview' && 'Pregled'}
                {currentView === 'stations' && 'Stanice'}
                {currentView === 'users' && 'Korisnici'}
                {currentView === 'subscriptions' && 'Pretplate'}
                {currentView === 'analytics' && 'Analitika'}
                {currentView === 'settings' && 'Podešavanja'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dobrodošli nazad, Administrator
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-infinity-dark-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="text-infinity-green-500" size={20} />
                ) : (
                  <Moon className="text-gray-700" size={20} />
                )}
              </button>

              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Admin Mode
                </span>
              </div>

              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-1" />
                Odjavi se
              </Button>
            </div>
          </div>
        </header>

        <main className="p-8">
          {renderContent()}
        </main>
      </div>

      <AddStationModal
        isOpen={showAddStation}
        onClose={() => setShowAddStation(false)}
        onSuccess={() => {
          setShowAddStation(false);
          fetchDashboardData();
        }}
      />

      <EditStationModal
        isOpen={showEditStation}
        onClose={() => {
          setShowEditStation(false);
          setSelectedStation(null);
        }}
        onSuccess={() => {
          setShowEditStation(false);
          setSelectedStation(null);
          fetchDashboardData();
        }}
        station={selectedStation}
      />
    </div>
  );
}
