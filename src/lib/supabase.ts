import { auth, stations, profiles } from './api';
import { RadioStation, UserProfile } from '../types';

// Adapter for AdminDashboard compatibility
export const supabaseAuth = {
    getAllProfiles: async () => {
        try {
            return await auth.getAllProfiles() as UserProfile[];
        } catch (e) {
            console.error('Failed to fetch profiles:', e);
            return [] as UserProfile[];
        }
    },

    updateProfile: async (id: string, updates: Partial<UserProfile>) => {
        try {
            await profiles.update(id, updates);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    getProfile: async (id: string) => {
        try {
            return await profiles.getById(id);
        } catch (e) {
            return null;
        }
    },

    getCurrentUser: async () => {
        return await auth.getCurrentUser();
    },

    signIn: async (email: string, password: string) => {
        const data = await auth.login(email, password);
        return { user: data.user, profile: data.user };
    },

    signUp: async (email: string, password: string) => {
        const data = await auth.register(email, password, email.split('@')[0], '');
        return { user: data.user, profile: data.user };
    },

    signOut: async () => {
        auth.logout();
    }
};

export const supabaseStations = {
    getAll: async () => {
        try {
            return await stations.getAll();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    create: async (station: Omit<RadioStation, 'id' | 'created_at'>) => {
        try {
            const response = await stations.create(station);
            return response.success ? response.id : null;
        } catch (e) {
            console.error('Failed to create station:', e);
            return null;
        }
    },

    update: async (id: string, updates: Partial<RadioStation>) => {
        try {
            const response = await stations.update(id, updates);
            return response.success;
        } catch (e) {
            console.error('Failed to update station:', e);
            return false;
        }
    },

    delete: async (id: string) => {
        try {
            const response = await stations.delete(id);
            return response.success;
        } catch (e) {
            console.error('Failed to delete station:', e);
            return false;
        }
    }
};

// Mock supabase object for event subscription
export const supabase = {
    auth: {
        onAuthStateChange: (_callback: any) => {
            // Mock subscription
            return {
                data: {
                    subscription: {
                        unsubscribe: () => { }
                    }
                }
            };
        }
    }
};
