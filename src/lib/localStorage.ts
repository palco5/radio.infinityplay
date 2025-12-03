// LocalStorage servis za zamenu Supabase funkcionalnosti
import { UserProfile, RadioStation } from '../types';
import { eventBus, EVENTS } from './eventBus';

interface LocalUser {
    id: string;
    email: string;
    password: string;
    created_at: string;
}

// Ključevi za localStorage
const STORAGE_KEYS = {
    USERS: 'infinity_users',
    CURRENT_USER: 'infinity_current_user',
    PROFILES: 'infinity_profiles',
    STATIONS: 'infinity_stations',
    FAVORITES: 'infinity_favorites',
    THEME_SETTINGS: 'infinity_theme_settings',
};

// Inicijalizacija mock podataka
const initializeMockData = () => {
    // Proveri da li već postoje stanice
    const existingStations = localStorage.getItem(STORAGE_KEYS.STATIONS);

    if (!existingStations) {
        const mockStations: RadioStation[] = [
            {
                id: '1',
                name: 'Infinity Chill',
                description: 'Opuštajuća muzika za relaksaciju',
                genre: 'Chill',
                logo_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
                stream_url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
                medicp_id: null,
                bitrate: 128,
                is_featured: false,
                is_active: true,
                listener_count: 0,
                icon_url: null,
                icon_emoji: '🎵',
                background_url: null,
                background_color: '#10b981',
                background_type: 'solid',
                grid_row: null,
                grid_column: null,
                grid_page: 1,
                recommended_for: ['Restoran', 'Kafić', 'Hotel'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: '2',
                name: 'Infinity Rock',
                description: 'Najbolji rock hitovi',
                genre: 'Rock',
                logo_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400',
                stream_url: 'https://stream.zeno.fm/8wv4d8g4d48uv',
                medicp_id: null,
                bitrate: 128,
                is_featured: false,
                is_active: true,
                listener_count: 0,
                icon_url: null,
                icon_emoji: '🎸',
                background_url: null,
                background_color: '#ef4444',
                background_type: 'solid',
                grid_row: null,
                grid_column: null,
                grid_page: 1,
                recommended_for: ['Bar', 'Teretana', 'Prodavnica'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: '3',
                name: 'Infinity Pop',
                description: 'Popularni hitovi',
                genre: 'Pop',
                logo_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
                stream_url: 'https://stream.zeno.fm/0r0xa792kwzuv',
                medicp_id: null,
                bitrate: 128,
                is_featured: true,
                is_active: true,
                listener_count: 0,
                icon_url: null,
                icon_emoji: '🎤',
                background_url: null,
                background_color: '#ec4899',
                background_type: 'solid',
                grid_row: null,
                grid_column: null,
                grid_page: 1,
                recommended_for: ['Prodavnica', 'Salon lepote', 'Kafić'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: '4',
                name: 'Infinity Jazz',
                description: 'Smooth jazz za svaku priliku',
                genre: 'Jazz',
                logo_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400',
                stream_url: 'https://stream.zeno.fm/f7wvbbqmdg8uv',
                medicp_id: null,
                bitrate: 128,
                is_featured: false,
                is_active: true,
                listener_count: 0,
                icon_url: null,
                icon_emoji: '🎷',
                background_url: null,
                background_color: '#8b5cf6',
                background_type: 'solid',
                grid_row: null,
                grid_column: null,
                grid_page: 1,
                recommended_for: ['Restoran', 'Hotel', 'Lounge bar'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: '5',
                name: 'Infinity Electronic',
                description: 'Elektronska muzika i EDM',
                genre: 'Electronic',
                logo_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
                stream_url: 'https://stream.zeno.fm/h5wvbbqmdg8uv',
                medicp_id: null,
                bitrate: 128,
                is_featured: false,
                is_active: true,
                listener_count: 0,
                icon_url: null,
                icon_emoji: '⚡',
                background_url: null,
                background_color: '#3b82f6',
                background_type: 'solid',
                grid_row: null,
                grid_column: null,
                grid_page: 1,
                recommended_for: ['Noćni klub', 'Teretana', 'Bar'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];

        localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(mockStations));
    }

    // Inicijalizuj admin korisnika ako ne postoji
    const users = getUsers();
    const adminExists = users.some(u => u.email === 'darkospira@gmail.com');

    if (!adminExists) {
        const adminUser: LocalUser = {
            id: 'admin-1',
            email: 'darkospira@gmail.com',
            password: 'Racivaci5!', // U produkciji bi ovo bilo heširano
            created_at: new Date().toISOString(),
        };

        const adminProfile: UserProfile = {
            id: 'admin-1',
            email: 'darkospira@gmail.com',
            username: 'admin',
            display_name: 'Admin',
            avatar_url: null,
            bio: null,
            first_name: 'Admin',
            last_name: null,
            phone_number: null,
            country_code: 'RS',
            subscription_tier: 'branded-radio',
            subscription_status: 'active',
            subscription_ends_at: null,
            trial_ends_at: null,
            trial_started_at: null,
            cancel_at_period_end: false,
            theme_preference: 'dark',
            total_listening_minutes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_admin: true,
            newsletter_subscribed: false,
            email_notifications: true,
            business_category: null,
            custom_location: null,
            selected_plan_id: null,
            onboarding_completed: true,
            confetti_shown: false,
            trial_ui_config: null,
            recommended_stations: [],
            jingle_url: null,
            jingle_interval_minutes: 7,
        };

        users.push(adminUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        const profiles = getProfiles();
        profiles.push(adminProfile);
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    }

    // Fix data for specific user requests
    const fixData = () => {
        const users = getUsers();
        const profiles = getProfiles();
        let usersChanged = false;
        let profilesChanged = false;
        let dataReloaded = false;

        // 1. Fix test@gmail.com
        const testUser = users.find(u => u.email === 'test@gmail.com');
        if (testUser) {
            const testProfile = profiles.find(p => p.id === testUser.id);
            if (testProfile) {
                // Force trial status if not active subscription or if trial dates are missing
                if (testProfile.subscription_status !== 'active' && testProfile.subscription_status !== 'trial') {
                    testProfile.subscription_status = 'trial';
                    testProfile.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                    testProfile.subscription_tier = 'ad-free'; // Basic Radio
                    profilesChanged = true;
                } else if (testProfile.subscription_status === 'trial') {
                    // Ensure trial date is valid (in the future)
                    const trialEnd = testProfile.trial_ends_at ? new Date(testProfile.trial_ends_at) : new Date(0);
                    if (trialEnd < new Date()) {
                        testProfile.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                        profilesChanged = true;
                    }
                }
            }
        }

        // 2. Remove admin123 users
        const usersToDelete = users.filter(u => u.password === 'admin123');
        if (usersToDelete.length > 0) {
            const idsToDelete = usersToDelete.map(u => u.id);
            const newUsers = users.filter(u => !idsToDelete.includes(u.id));
            saveUsers(newUsers);

            const newProfiles = profiles.filter(p => !idsToDelete.includes(p.id));
            saveProfiles(newProfiles);

            dataReloaded = true;
        }

        // 3. Ensure darkospira@gmail.com has correct password and active subscription
        const adminUser = users.find(u => u.email === 'darkospira@gmail.com');
        if (adminUser && adminUser.password !== 'Racivaci5!') {
            adminUser.password = 'Racivaci5!';
            usersChanged = true;
        }

        // 4. Ensure admin has permanent active subscription (no payment needed)
        const adminProfile = profiles.find(p => p.email === 'darkospira@gmail.com');
        if (adminProfile) {
            let adminChanged = false;
            if (adminProfile.subscription_status !== 'active') {
                adminProfile.subscription_status = 'active';
                adminChanged = true;
            }
            if (adminProfile.subscription_tier !== 'branded-radio') {
                adminProfile.subscription_tier = 'branded-radio';
                adminChanged = true;
            }
            if (adminProfile.trial_ends_at !== null) {
                adminProfile.trial_ends_at = null;
                adminChanged = true;
            }
            if (adminProfile.subscription_ends_at !== null) {
                adminProfile.subscription_ends_at = null; // Never expires
                adminChanged = true;
            }
            if (!adminProfile.is_admin) {
                adminProfile.is_admin = true;
                adminChanged = true;
            }
            if (adminChanged) {
                profilesChanged = true;
            }
        }

        if (!dataReloaded) {
            if (usersChanged) saveUsers(users);
            if (profilesChanged) saveProfiles(profiles);
        }
    };

    fixData();
};

// Helper funkcije
const getUsers = (): LocalUser[] => {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
};

const getProfiles = (): UserProfile[] => {
    const profiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return profiles ? JSON.parse(profiles) : [];
};

const saveUsers = (users: LocalUser[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

const saveProfiles = (profiles: UserProfile[]) => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
};

// Auth funkcije
export const localAuth = {
    signUp: async (email: string, password: string) => {
        const users = getUsers();

        if (users.some(u => u.email === email)) {
            throw new Error('Korisnik sa ovim email-om već postoji');
        }

        const newUser: LocalUser = {
            id: `user-${Date.now()}`,
            email,
            password,
            created_at: new Date().toISOString(),
        };

        const newProfile: UserProfile = {
            id: newUser.id,
            email,
            username: email.split('@')[0],
            display_name: email.split('@')[0],
            avatar_url: null,
            bio: null,
            first_name: null,
            last_name: null,
            phone_number: null,
            country_code: 'RS',
            subscription_tier: 'free',
            subscription_status: 'active',
            subscription_ends_at: null,
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            trial_started_at: null,
            cancel_at_period_end: false,
            theme_preference: 'dark',
            total_listening_minutes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_admin: false,
            newsletter_subscribed: false,
            email_notifications: true,
            business_category: null,
            custom_location: null,
            selected_plan_id: null,
            onboarding_completed: false,
            confetti_shown: false,
            trial_ui_config: null,
            recommended_stations: [],
            jingle_url: null,
            jingle_interval_minutes: 7,
        };

        users.push(newUser);
        saveUsers(users);

        const profiles = getProfiles();
        profiles.push(newProfile);
        saveProfiles(profiles);

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));

        return { user: newUser, profile: newProfile };
    },

    signIn: async (email: string, password: string) => {
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            throw new Error('Pogrešan email ili lozinka');
        }

        const profiles = getProfiles();
        const profile = profiles.find(p => p.id === user.id);

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

        return { user, profile };
    },

    signOut: async () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return userStr ? JSON.parse(userStr) : null;
    },

    getProfile: (userId: string): UserProfile | null => {
        const profiles = getProfiles();
        return profiles.find(p => p.id === userId) || null;
    },

    updateProfile: (userId: string, updates: Partial<UserProfile>) => {
        const profiles = getProfiles();
        const index = profiles.findIndex(p => p.id === userId);

        if (index !== -1) {
            profiles[index] = { ...profiles[index], ...updates, updated_at: new Date().toISOString() };
            saveProfiles(profiles);
            eventBus.emit(EVENTS.USER_PROFILE_UPDATED, { userId, profile: profiles[index] });
            return profiles[index];
        }

        return null;
    },
};

// Radio stanice funkcije
export const localStations = {
    getAll: (): RadioStation[] => {
        const stations = localStorage.getItem(STORAGE_KEYS.STATIONS);
        return stations ? JSON.parse(stations) : [];
    },

    getActive: (): RadioStation[] => {
        return localStations.getAll().filter(s => s.is_active);
    },

    getById: (id: string): RadioStation | null => {
        const stations = localStations.getAll();
        return stations.find(s => s.id === id) || null;
    },

    create: (station: Omit<RadioStation, 'id' | 'created_at'>): RadioStation => {
        const stations = localStations.getAll();
        const newStation: RadioStation = {
            ...station,
            id: `station-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        stations.push(newStation);
        localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(stations));
        eventBus.emit(EVENTS.STATION_CREATED, newStation);

        return newStation;
    },

    update: (id: string, updates: Partial<RadioStation>): RadioStation | null => {
        const stations = localStations.getAll();
        const index = stations.findIndex(s => s.id === id);

        if (index !== -1) {
            stations[index] = { ...stations[index], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(stations));
            eventBus.emit(EVENTS.STATION_UPDATED, stations[index]);
            return stations[index];
        }

        return null;
    },

    delete: (id: string): boolean => {
        const stations = localStations.getAll();
        const filtered = stations.filter(s => s.id !== id);

        if (filtered.length < stations.length) {
            localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(filtered));
            eventBus.emit(EVENTS.STATION_DELETED, { id });
            return true;
        }

        return false;
    },
};

// Favoriti funkcije
export const localFavorites = {
    get: (userId: string): string[] => {
        const favorites = localStorage.getItem(`${STORAGE_KEYS.FAVORITES}_${userId}`);
        return favorites ? JSON.parse(favorites) : [];
    },

    add: (userId: string, stationId: string) => {
        const favorites = localFavorites.get(userId);
        if (!favorites.includes(stationId)) {
            favorites.push(stationId);
            localStorage.setItem(`${STORAGE_KEYS.FAVORITES}_${userId}`, JSON.stringify(favorites));
        }
    },

    remove: (userId: string, stationId: string) => {
        const favorites = localFavorites.get(userId);
        const filtered = favorites.filter(id => id !== stationId);
        localStorage.setItem(`${STORAGE_KEYS.FAVORITES}_${userId}`, JSON.stringify(filtered));
    },

    toggle: (userId: string, stationId: string) => {
        const favorites = localFavorites.get(userId);
        if (favorites.includes(stationId)) {
            localFavorites.remove(userId, stationId);
        } else {
            localFavorites.add(userId, stationId);
        }
    },
};

// Theme settings
export const localTheme = {
    get: (userId: string) => {
        const settings = localStorage.getItem(`${STORAGE_KEYS.THEME_SETTINGS}_${userId}`);
        return settings ? JSON.parse(settings) : null;
    },

    save: (userId: string, settings: any) => {
        localStorage.setItem(`${STORAGE_KEYS.THEME_SETTINGS}_${userId}`, JSON.stringify(settings));
    },
};

// Inicijalizuj podatke pri učitavanju
initializeMockData();

export { STORAGE_KEYS };
