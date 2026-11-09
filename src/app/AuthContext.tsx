import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types/domain';
import { api, ApiError } from './api';

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

type Auth = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const expire = () => setUser(null);
    // The profile page can change the display name; reload the identity so the
    // header and avatar stay in step.
    const refresh = () => {
      api<{ user: AuthUser }>('/auth/me')
        .then(data => { if (alive) setUser(data.user); })
        .catch(() => { /* the next request will surface the failure */ });
    };
    window.addEventListener('auth-expired', expire);
    window.addEventListener('profile-updated', refresh);
    api<{ user: AuthUser }>('/auth/me').then(data => { if (alive) setUser(data.user); }).catch(e => {
      if (alive && !(e instanceof ApiError && e.status === 401)) setError(e.message);
    }).finally(() => { if (alive) setLoading(false); });
    return () => {
      alive = false;
      window.removeEventListener('auth-expired', expire);
      window.removeEventListener('profile-updated', refresh);
    };
  }, []);
  async function login(email: string, password: string) { const data = await api<{user: AuthUser}>('/auth/login', { email, password }); setUser(data.user); setError(''); }
  async function signUp(input: SignUpInput) { const data = await api<{user: AuthUser}>('/auth/sign-up', input); setUser(data.user); setError(''); }
  async function logout() { await api('/auth/logout', {}); setUser(null); }
  return <Context.Provider value={{ user, loading, error, login, signUp, logout }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('AuthProvider is required'); return value; }
