import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import {
  isAuthenticated as readAuthFlag,
  logout as clearAuth,
  setAuthenticated,
  validatePassword,
} from '../services/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthState] = useState(() => readAuthFlag());

  const login = useCallback((password: string) => {
    const ok = validatePassword(password);
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
