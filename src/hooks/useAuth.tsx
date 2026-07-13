import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import {
  isAuthenticated as readAuthFlag,
  logout as clearAuth,
  setAuthenticated,
} from '../services/auth';
import { validateCredentials } from '../services/db';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthState] = useState(() => readAuthFlag());

  const login = useCallback(async (username: string, password: string) => {
    const ok = await validateCredentials(username, password);
    if (ok) {
      setAuthenticated(true);
      setAuthState(true);
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthState(false);
  }, []);

  const value = useMemo(
    () => ({ authenticated, login, logout }),
    [authenticated, login, logout],
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
