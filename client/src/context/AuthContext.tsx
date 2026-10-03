import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY } from '@/lib/api';
import { setLanguage } from '@/i18n';

export type Role = 'DIRECTOR' | 'MANAGER' | 'TEACHER';
export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  position: string;
  language: 'uz' | 'ru';
  photoUrl: string | null;
  profileCompletedAt: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get('/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await api.post('/auth/login', { phone, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user as AuthUser;
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/me');
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // keep UI language in sync with the stored user preference on login
  useEffect(() => {
    if (user && !localStorage.getItem('lang')) setLanguage(user.language);
  }, [user]);

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

export const homeFor = (role: Role) => (role === 'TEACHER' ? '/me' : '/');
