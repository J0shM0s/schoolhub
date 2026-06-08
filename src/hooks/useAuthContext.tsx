import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthSession, AuthUser, createUser, getSession, loginUser, saveSession } from '../lib/localStorage';

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getSession();
    setSession(stored);
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const user = createUser(email, password);
      const newSession: AuthSession = { user };
      saveSession(newSession);
      setSession(newSession);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unable to create account'),
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const user = loginUser(email, password);
      const newSession: AuthSession = { user };
      saveSession(newSession);
      setSession(newSession);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unable to sign in'),
      };
    }
  };

  const signOut = async () => {
    saveSession(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
