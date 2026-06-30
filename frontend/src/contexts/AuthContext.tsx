import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(user), isLoading, login, logout, refreshUser }),
    [user, token, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
