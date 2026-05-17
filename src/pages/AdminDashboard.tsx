import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth as authApi, stations as stationsApi, profiles as profilesApi } from '../lib/api';
import { EVENTS, useEventBus } from '../lib/eventBus';
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
  DollarSign,
  Activity,
  Search,
  Filter,
  Ban,

  Mail
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AddStationModal from '../components/admin/AddStationModal';
import EditStationModal from '../components/admin/EditStationModal';
import RecommendStationsModal from '../components/admin/RecommendStationsModal';
import EditUserModal from '../components/admin/EditUserModal';
import SendPasswordResetModal from '../components/admin/SendPasswordResetModal';
import BulkUserActionsModal from '../components/admin/BulkUserActionsModal';
import CreateUserModal from '../components/admin/CreateUserModal';
import DashboardSelectionModal from '../components/dashboard/DashboardSelectionModal';

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
  const [showRecommendStations, setShowRecommendStations] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user?.email !== 'darkospira@gmail.com') {
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [user, navigate]);

  useEffect(() => {
    filterUsers();
  }, [userSearchQuery, userFilterCategory, users]);

  // Business categories - mock data za sada
  useEffect(() => {
    const mockCategories = [
      { id: '1', name: 'restaurant', display_name_sr: 'Restoran', icon: '🍽️', sort_order: 1 },
      { id: '2', name: 'cafe', display_name_sr: 'Kafić', icon: '☕', sort_order: 2 },
      { id: '3', name: 'bar', display_name_sr: 'Bar', icon: '🍺', sort_order: 3 },
      { id: '4', name: 'gym', display_name_sr: 'Teretana', icon: '💪', sort_order: 4 },
      { id: '5', name: 'spa', display_name_sr: 'Spa', icon: '🧖', sort_order: 5 },
      { id: '6', name: 'retail', display_name_sr: 'Prodavnica', icon: '🛍️', sort_order: 6 },
      { id: '7', name: 'hotel', display_name_sr: 'Hotel', icon: '🏨', sort_order: 7 },
      { id: '8', name: 'office', display_name_sr: 'Kancelarija', icon: '🏢', sort_order: 8 },
    ];
    setBusinessCategories(mockCategories);
  }, []);

  useEventBus(EVENTS.STATION_UPDATED, () => {
    fetchDashboardData();
  });

  useEventBus(EVENTS.USER_PROFILE_UPDATED, () => {
    fetchDashboardData();
  });

  useEffect(() => {
    if (stations.length > 0) {
      const counts: Record<string, number> = {};
      stations.forEach(s => {
        counts[s.id] = s.listener_count || 0;
      });
      setListenerCounts(counts);
    }
  }, [stations]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Učitaj podatke iz API
      const allStations = await stationsApi.getAll();
      const allUsers = await authApi.getAllProfiles() as UserProfile[];

      // Filtriraj aktivne pretplate i trial korisnike
      const activeSubscriptions = allUsers.filter(u => u.subscription_status === 'active');
      const trialUsers = allUsers.filter(u => u.trial_ends_at && new Date(u.trial_ends_at) > new Date());

      // Mock payments - u produkciji će biti iz baze
      const mockPayments: any[] = [];

      setStats({
        totalUsers: allUsers.length,
        activeSubscriptions: activeSubscriptions.length,
        totalStations: allStations.length,
        monthlyRevenue: 0,
        trialUsers: trialUsers.length,
      });

      setStations(allStations as RadioStation[]);
      setUsers(allUsers);
      setPayments(mockPayments);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, []);

  // Analytics će biti implementirana nakon produkcije
  useEffect(() => {
    setAnalytics({
      topStations: [],
      dailyData: [],
    });
  }, []);

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

    try {
      await stationsApi.delete(stationId);
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting station:', error);
      alert('Greška pri brisanju stanice.');
    }
  };

  const handleToggleStationStatus = async (stationId: string, currentStatus: boolean) => {
    try {
      await stationsApi.update(stationId, { is_active: !currentStatus });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating station status:', error);
    }
  };

  const handleEditStation = (station: RadioStation) => {
    setSelectedStation(station);
    setShowEditStation(true);
  };

  const handleToggleUserAccess = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await profilesApi.update(userId, { subscription_status: newStatus });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating user access:', error);
    }
  };

  const handleAddAdmin = async (email: string) => {
    try {
      const allUsers = await authApi.getAllProfiles();
      const userData = allUsers.find((u: UserProfile) => u.email === email);

      if (!userData) {
        alert('Korisnik sa ovim emailom nije pronađen');
        return;
      }

      await profilesApi.update(userData.id, { is_admin: true });
      alert('Admin privilegije su dodeljene uspešno!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding admin:', error);
    }
  };

  const handleRecommendStations = (user: UserProfile) => {
    setSelectedUser(user);
    setShowRecommendStations(true);
  };

  const handleSaveRecommendedStations = async (userId: string, stationIds: string[]) => {
    try {
      await profilesApi.update(userId, { recommended_stations: stationIds });
      alert('Preporučene stanice su uspešno sačuvane!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving recommended stations:', error);
      alert('Greška pri čuvanju preporuka.');
    }
  };

  const handleAssignFreePlan = async (userId: string) => {
    if (!confirm('Da li ste sigurni da želite da ovom korisniku dodelite FREE paket? Ovo će otkazati trenutnu pretplatu.')) return;

    try {
      await profilesApi.update(userId, {
        subscription_status: 'inactive',
        subscription_tier: 'free',
        trial_ends_at: null,
        subscription_ends_at: null,
        cancel_at_period_end: false
      });
      alert('Korisniku je uspešno dodeljen FREE paket!');
      fetchDashboardData();
    } catch (error) {
      alert('Greška pri dodeli paketa.');
    }
  };



  const handleExportUsersCSV = () => {
    const csvContent = [
      ['Email', 'Ime', 'Prezime', 'Kategorija', 'Status', 'Plan', 'Newsletter', 'Datum registracije'].join(','),
      ...users.map(u => [
        u.email,
        u.first_name || '',
        u.last_name || '',
        u.business_category || '',
        u.subscription_status,
        u.subscription_tier || 'free',
        u.newsletter_subscribed ? 'Da' : 'Ne',
        u.created_at ? new Date(u.created_at).toLocaleDateString('sr-RS') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'korisnici.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderOverview = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Ukupno Korisnika</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Aktivne Pretplate</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSubscriptions}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-infinity-green-400 to-infinity-green-600 rounded-xl flex items-center justify-center">
              <CreditCard className="text-white" size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Probni Periodi</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.trialUsers}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
          </div>
          <div className="mt-3 md:mt-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Aktivnih probnih perioda
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Radio Stanice</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStations}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
              <Radio className="text-white" size={20} />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-400">
            <Activity size={14} className="mr-1" />
            <span>{stations.filter(s => s.is_active).length} aktivnih</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Ukupan Prihod</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">€{stats.monthlyRevenue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="text-white" size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Najslušanije Stanice
          </h3>
          <div className="space-y-2 md:space-y-3">
            {stations.slice(0, 5).map((station, index) => (
              <div key={station.id} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-infinity rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base text-gray-900 dark:text-white">{station.name}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{station.genre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {listenerCounts[station.id] > 0 && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{listenerCounts[station.id] || 0}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">slušalaca</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Nedavne Aktivnosti
          </h3>
          <div className="flex flex-col items-center justify-center py-8 md:py-12">
            <Activity className="text-gray-400 mb-4" size={40} />
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center">
              Aktivnosti će biti prikazane nakon produkcijskog deploy-a
            </p>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderStations = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white">
          Upravljanje Stanicama
        </h2>
        <Button variant="primary" onClick={() => setShowAddStation(true)} size="sm" className="w-full sm:w-auto">
          <Plus size={18} className="mr-2" />
          Nova Stanica
        </Button>
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {stations.map((station) => (
          <Card key={station.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{station.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{station.genre}</p>
                </div>
                <button
                  onClick={() => handleToggleStationStatus(station.id, station.is_active)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${station.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                >
                  {station.is_active ? 'Aktivna' : 'Neaktivna'}
                </button>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                {listenerCounts[station.id] > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
                <span className="text-gray-600 dark:text-gray-400">{listenerCounts[station.id] || 0} slušalaca</span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEditStation(station)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Edit size={16} />
                  <span className="text-sm font-medium">Izmeni</span>
                </button>
                <button
                  onClick={() => handleDeleteStation(station.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="text-sm font-medium">Obriši</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
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

        <Button variant="primary" onClick={() => setShowBulkActions(true)}>
          <Users className="mr-2" size={18} />
          Bulk Opcije
        </Button>
      </div>

      <div className="flex justify-end mb-4 gap-2">
        <Button variant="secondary" onClick={() => setShowCreateUser(true)}>
          <Plus className="mr-2" size={18} />
          Dodaj Korisnika
        </Button>
        <Button variant="outline" onClick={handleExportUsersCSV}>
          <DollarSign className="mr-2" size={18} />
          Export CSV
        </Button>
      </div>

      <Card className="hidden md:block">
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
                          onClick={() => { setSelectedUser(user); setShowEditUser(true); }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-600 rounded-lg transition-colors"
                          title="Izmeni korisnika"
                        >
                          <Edit className="text-gray-600 dark:text-gray-400" size={18} />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowPasswordReset(true); }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-600 rounded-lg transition-colors"
                          title="Resetuj lozinku"
                        >
                          <Mail className="text-blue-500" size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleUserAccess(user.id, user.subscription_status)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={user.subscription_status === 'active' ? 'Deaktiviraj pristup' : 'Aktiviraj pristup'}
                        >
                          <Ban className="text-red-600" size={18} />
                        </button>
                        <button
                          onClick={() => handleAssignFreePlan(user.id)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Dodeli FREE paket"
                        >
                          <DollarSign className="text-green-600" size={18} />
                        </button>
                        <button
                          onClick={() => handleRecommendStations(user)}
                          className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Preporuči stanice"
                        >
                          <Activity className="text-yellow-600" size={18} />
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredUsers.slice(0, 50).map((user) => {
          const category = businessCategories.find(c => c.name === user.business_category);
          return (
            <Card key={user.id} className="overflow-hidden">
              <div className="flex flex-col gap-4">
                {/* Header: User Info & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatar_url ? (
                      <span className="text-3xl shrink-0">{user.avatar_url}</span>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-infinity-green-100 dark:bg-infinity-green-900/30 flex items-center justify-center shrink-0">
                        <span className="text-infinity-green-600 font-bold text-lg">
                          {(user.display_name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">
                        {user.display_name || 'N/A'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleUserAccess(user.id, user.subscription_status)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 transition-colors ${user.subscription_status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                  >
                    {user.subscription_status === 'active' ? 'Aktivan' : 'Neaktivan'}
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-infinity-dark-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Kategorija</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200 text-sm flex items-center gap-1.5">
                      {category ? (
                        <>
                          <span className="text-base">{category.icon}</span>
                          <span className="truncate">{category.display_name_sr}</span>
                        </>
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-infinity-dark-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Plan</p>
                    <p className={`font-bold text-sm uppercase ${user.subscription_tier === 'branded-radio' ? 'text-purple-500' :
                      user.subscription_tier === 'host-radio' ? 'text-orange-500' :
                        'text-infinity-green-500'
                      }`}>
                      {user.subscription_tier || 'FREE'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setSelectedUser(user); setShowEditUser(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-infinity-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-infinity-dark-600 transition-colors"
                  >
                    <Edit size={16} />
                    <span className="text-[10px] font-medium">Izmeni</span>
                  </button>
                  <button
                    onClick={() => { setSelectedUser(user); setShowPasswordReset(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Mail size={16} />
                    <span className="text-[10px] font-medium">Reset</span>
                  </button>
                  <button
                    onClick={() => handleAssignFreePlan(user.id)}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <DollarSign size={16} />
                    <span className="text-[10px] font-medium">Plan</span>
                  </button>
                  <div className="relative group">
                    <button
                      onClick={() => handleRecommendStations(user)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                    >
                      <Activity size={16} />
                      <span className="text-[10px] font-medium">Preporuke</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
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
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('sr-RS') : ''}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Activity size={14} className="text-blue-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.total_listening_minutes || 0}
                          </span>
                        </div>
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
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Izgled
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tamna Tema</span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Admin Nalog
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dodaj Novog Admina
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email korisnika"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                  />
                  <Button variant="primary" onClick={() => handleAddAdmin(adminEmail)}>
                    Dodaj
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2" size={20} />
          Odjavi se
        </Button>
      </div>
    </div>
  );

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-infinity-dark-900">
        <div className="w-16 h-16 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinity-dark-900 flex">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white dark:bg-infinity-dark-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed h-full z-50 transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center space-x-2">
              <Radio className="text-infinity-green-500" size={28} />
              <span className="text-lg md:text-xl font-bold font-serif text-gray-900 dark:text-white">Admin</span>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-infinity-dark-700 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="space-y-1 md:space-y-2">
            <button
              onClick={() => { setCurrentView('overview'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'overview'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <LayoutDashboard size={18} />
              <span className="font-medium">Pregled</span>
            </button>

            <button
              onClick={() => { setCurrentView('stations'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'stations'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <Radio size={18} />
              <span className="font-medium">Stanice</span>
            </button>

            <button
              onClick={() => { setCurrentView('users'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'users'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <Users size={18} />
              <span className="font-medium">Korisnici</span>
            </button>

            <button
              onClick={() => { setCurrentView('subscriptions'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'subscriptions'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <CreditCard size={18} />
              <span className="font-medium">Pretplate</span>
            </button>

            <button
              onClick={() => { setCurrentView('analytics'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'analytics'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <BarChart3 size={18} />
              <span className="font-medium">Analitika</span>
            </button>

            <button
              onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }}
              className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-colors text-sm md:text-base ${currentView === 'settings'
                ? 'bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-infinity-dark-700'
                }`}
            >
              <Settings size={18} />
              <span className="font-medium">Podešavanja</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-infinity rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm md:text-base text-gray-900 dark:text-white truncate">Admin</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDashboardSelector(true)}
            className="mt-3 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-infinity-green-50 dark:bg-infinity-green-900/20 text-infinity-green-600 dark:text-infinity-green-400 rounded-xl hover:bg-infinity-green-100 dark:hover:bg-infinity-green-900/30 transition-colors text-sm font-medium"
          >
            <LayoutDashboard size={16} />
            <span>Promeni Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-infinity-dark-700 rounded-lg"
          >
            <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-infinity-dark-700"
            >
              {theme === 'dark' ? (
                <Sun className="text-infinity-green-500" size={20} />
              ) : (
                <Moon className="text-gray-700" size={20} />
              )}
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-infinity-dark-700"
            >
              <LogOut className="text-gray-700 dark:text-gray-300" size={20} />
            </button>
            <button
              onClick={() => setShowDashboardSelector(true)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-infinity-dark-700"
              title="Promeni Dashboard"
            >
              <LayoutDashboard className="text-infinity-green-500" size={20} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {currentView === 'overview' && renderOverview()}
          {currentView === 'stations' && renderStations()}
          {currentView === 'users' && renderUsers()}
          {currentView === 'subscriptions' && renderSubscriptions()}
          {currentView === 'analytics' && renderAnalytics()}
          {currentView === 'settings' && renderSettings()}
        </div>
      </main>

      <AddStationModal
        isOpen={showAddStation}
        onClose={() => setShowAddStation(false)}
        onSuccess={() => {
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
          fetchDashboardData();
        }}
        station={selectedStation}
      />

      {selectedUser && (
        <>
          <RecommendStationsModal
            isOpen={showRecommendStations}
            onClose={() => {
              setShowRecommendStations(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            stations={stations}
            onSave={handleSaveRecommendedStations}
          />
          <EditUserModal
            isOpen={showEditUser}
            onClose={() => {
              setShowEditUser(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSuccess={() => {
              fetchDashboardData();
              setSelectedUser(null);
            }}
          />
          <SendPasswordResetModal
            isOpen={showPasswordReset}
            onClose={() => {
              setShowPasswordReset(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        </>
      )}

      {showBulkActions && (
        <BulkUserActionsModal
          isOpen={showBulkActions}
          onClose={() => setShowBulkActions(false)}
          users={filteredUsers}
          onSuccess={fetchDashboardData}
        />
      )}

      {showCreateUser && (
        <CreateUserModal
          isOpen={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onUserCreated={() => {
            fetchDashboardData();
          }}
        />
      )}

      <DashboardSelectionModal
        isOpen={showDashboardSelector}
        onClose={() => setShowDashboardSelector(false)}
      />
    </div>
  );
}
