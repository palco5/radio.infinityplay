import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, profiles } from '../lib/api';
import { UserProfile } from '../types';

interface LocalUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: LocalUser | null;
  profile: UserProfile | null;
  session: any | null;
  loading: boolean;
  signUp: (email: string, password: string, first_name: string, last_name: string, phone_number: string, country_code: string, venue_name: string) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap token iz URL query stringa (za admin view novi tab)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('t');
    if (tokenFromUrl) {
      localStorage.setItem('auth_token', tokenFromUrl);
      // Ukloni token iz URL-a
      urlParams.delete('t');
      const newSearch = urlParams.toString() ? '?' + urlParams.toString() : '';
      window.history.replaceState(null, '', window.location.pathname + newSearch);
    }
  }, []);

  // Rethrows on failure so callers can tell a fresh profile from a failed
  // fetch — the trial-expiry check must never lock the user out on stale data.
  const refreshProfile = async () => {
    if (user) {
      try {
        const profileData = await profiles.getById(user.id);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to refresh profile:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await auth.getCurrentUser();

        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            created_at: currentUser.created_at || new Date().toISOString(),
          });

          // Fetch full profile
          try {
            const profileData = await profiles.getById(currentUser.id);
            setProfile(profileData);
          } catch (e) {
            console.error('Error fetching profile:', e);
            // Fallback to basic user data if profile fetch fails
            setProfile(currentUser as unknown as UserProfile);
          }

          setSession({ user: currentUser });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear token if invalid
        auth.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signUp = async (email: string, password: string, first_name: string, last_name: string, phone_number: string, country_code: string, venue_name: string) => {
    // Register no longer logs the user in — it returns
    // { requiresVerification: true, email }. The account is activated only
    // after the email PIN is confirmed via verifyEmail().
    return auth.register(email, password, first_name, last_name, phone_number, country_code, venue_name);
  };

  const verifyEmail = async (email: string, code: string) => {
    // Confirms the registration PIN and logs the user in.
    const data = await auth.verifyEmail(email, code);
    const newUser = data.user;

    setUser({
      id: newUser.id,
      email: newUser.email || '',
      created_at: new Date().toISOString(),
    });

    setProfile(newUser as unknown as UserProfile);
    setSession({ user: newUser });
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Login returns { user, token }
      const data = await auth.login(email, password);

      const loggedUser = data.user;

      setUser({
        id: loggedUser.id,
        email: loggedUser.email || '',
        created_at: loggedUser.created_at || new Date().toISOString(),
      });

      setProfile(loggedUser as unknown as UserProfile);
      setSession({ user: loggedUser });
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    auth.logout();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        verifyEmail,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth mora biti korišćen unutar AuthProvider-a');
  }
  return context;
}
