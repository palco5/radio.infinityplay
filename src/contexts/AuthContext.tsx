import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { localAuth } from '../lib/localStorage';
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
  signUp: (email: string, password: string) => Promise<void>;
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

  const refreshProfile = async () => {
    if (user) {
      const profileData = localAuth.getProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Proveri da li postoji trenutni korisnik
    const currentUser = localAuth.getCurrentUser();

    if (currentUser) {
      setUser(currentUser);
      const profileData = localAuth.getProfile(currentUser.id);
      setProfile(profileData);
      setSession({ user: currentUser });
    }

    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { user: newUser, profile: newProfile } = await localAuth.signUp(email, password);
      setUser(newUser);
      setProfile(newProfile);
      setSession({ user: newUser });
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: loggedUser, profile: userProfile } = await localAuth.signIn(email, password);
      setUser(loggedUser);
      setProfile(userProfile ?? null);
      setSession({ user: loggedUser });
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await localAuth.signOut();
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
