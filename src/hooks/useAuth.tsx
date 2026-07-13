import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext } from './authContext';
import {
  fetchSession,
  loginRequest,
  logoutRequest,
} from '../services/journal';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const refreshSession = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await fetchSession();
      setAuthenticated(ok);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    await loginRequest(username, password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAuthenticated(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      checking,
      login,
      logout,
      refreshSession,
    }),
    [authenticated, checking, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
