import { createContext } from 'react';

export interface AuthContextValue {
  authenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
