import axios from 'axios';
import { store } from './storage';

export const TOKEN_KEY = 'token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = store.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      store.remove(TOKEN_KEY);
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export const errorCode = (e: unknown): string =>
  axios.isAxiosError(e) ? (e.response?.data?.error ?? 'NETWORK_ERROR') : 'INTERNAL_ERROR';

/** Resolves an API-relative upload path (e.g. /uploads/...) to a full URL. */
export function uploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (base?.startsWith('http')) return new URL(path, base).toString();
  return path;
}
