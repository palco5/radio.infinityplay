import { createClient } from '@supabase/supabase-js';
import { UserProfile, RadioStation } from '../types';

// Supabase konfiguracija - koristi environment varijable ili hardkodovane vrednosti
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://huyiaierkscuhxlvvtit.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth funkcije
export const supabaseAuth = {
  signUp: async (email: string, password: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Greška pri kreiranju korisnika');

    // Kreiraj profil
    const newProfile: Partial<UserProfile> = {
      id: authData.user.id,
      email,
      username: email.split('@')[0],
      display_name: email.split('@')[0],
      subscription_tier: 'free',
      subscription_status: 'active',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      theme_preference: 'dark',
      is_admin: false,
      newsletter_subscribed: false,
      email_notifications: true,
      onboarding_completed: false,
      confetti_shown: false,
      jingle_interval_minutes: 7,
      total_listening_minutes: 0,
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([newProfile]);

    if (profileError) throw profileError;

    return { user: authData.user, profile: newProfile };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Greška pri prijavljivanju');

    // Učitaj profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return { user: data.user, profile };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getAllProfiles: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// Radio stanice funkcije
export const supabaseStations = {
  getAll: async (): Promise<RadioStation[]> => {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getActive: async (): Promise<RadioStation[]> => {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<RadioStation | null> => {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching station:', error);
      return null;
    }

    return data;
  },

  create: async (station: Omit<RadioStation, 'id' | 'created_at' | 'updated_at'>): Promise<RadioStation> => {
    const { data, error } = await supabase
      .from('stations')
      .insert([{
        ...station,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<RadioStation>): Promise<RadioStation> => {
    const { data, error } = await supabase
      .from('stations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('stations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Real-time listener count update
  updateListenerCount: async (stationId: string, count: number) => {
    const { error } = await supabase
      .from('stations')
      .update({ listener_count: count })
      .eq('id', stationId);

    if (error) console.error('Error updating listener count:', error);
  },
};

// Favoriti funkcije
export const supabaseFavorites = {
  get: async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('favorites')
      .select('station_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data?.map(f => f.station_id) || [];
  },

  add: async (userId: string, stationId: string) => {
    const { error } = await supabase
      .from('favorites')
      .insert([{ user_id: userId, station_id: stationId }]);

    if (error) console.error('Error adding favorite:', error);
  },

  remove: async (userId: string, stationId: string) => {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('station_id', stationId);

    if (error) console.error('Error removing favorite:', error);
  },

  toggle: async (userId: string, stationId: string) => {
    const favorites = await supabaseFavorites.get(userId);
    if (favorites.includes(stationId)) {
      await supabaseFavorites.remove(userId, stationId);
    } else {
      await supabaseFavorites.add(userId, stationId);
    }
  },
};

// Real-time subscriptions
export const subscribeToStations = (callback: (payload: any) => void) => {
  return supabase
    .channel('stations-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, callback)
    .subscribe();
};

export const subscribeToProfiles = (callback: (payload: any) => void) => {
  return supabase
    .channel('profiles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
    .subscribe();
};

// Listening analytics
export const supabaseAnalytics = {
  logListeningSession: async (userId: string, stationId: string, durationMinutes: number) => {
    const { error } = await supabase
      .from('listening_sessions')
      .insert([{
        user_id: userId,
        station_id: stationId,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
      }]);

    if (error) console.error('Error logging session:', error);
  },

  getUserStats: async (userId: string) => {
    const { data, error } = await supabase
      .from('listening_sessions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    const totalMinutes = data?.reduce((sum, session) => sum + session.duration_minutes, 0) || 0;
    const totalSessions = data?.length || 0;

    return {
      totalMinutes,
      totalSessions,
      averageSessionLength: totalSessions > 0 ? totalMinutes / totalSessions : 0,
    };
  },
};
