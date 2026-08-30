import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, profiles } from '../lib/api';
import { UserProfile } from '../types';

// Dekoduj payload JWT-a lokalno (bez provere potpisa — server proverava potpis na
// svakom zahtevu). Koristi se da postavimo korisnika iz tokena bez mrežnog poziva,
// pa sesija preživi mrežni/serverski prekid i nikad se ne izloguje sama.
function decodeJwtPayload(token: string): { userId?: string; email?: string; exp?: number } | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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
      const token = localStorage.getItem('auth_token');
      if (!token) { setLoading(false); return; }

      const payload = decodeJwtPayload(token);
      const expired = !!payload?.exp && payload.exp * 1000 <= Date.now();
      if (!payload?.userId || expired) {
        // Nema važećeg tokena lokalno (ili je istekao) — nije prijavljen. Ne diramo
        // ništa nasilno; korisnik se prijavljuje ponovo samo ako je token stvarno istekao.
        setLoading(false);
        return;
      }

      // Postavi korisnika ODMAH iz tokena — sesija preživljava mrežne/serverske
      // prekide. NIKAD se ne izlogujemo automatski, samo na ručni "Odjavi se".
      setUser({ id: payload.userId, email: payload.email || '', created_at: new Date().toISOString() });
      setSession({ user: { id: payload.userId, email: payload.email } });

      // Best-effort: povuci pun profil. Ako padne (mreža/server), NE izlogujemo —
      // zadržavamo sesiju; profil se povuče na sledećem osvežavanju.
      try {
        const profileData = await profiles.getById(payload.userId);
        setProfile(profileData);
      } catch (e) {
        console.error('Profile fetch (non-fatal):', e);
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
