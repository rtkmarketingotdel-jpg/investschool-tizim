import axios from 'axios';

export const TOKEN_KEY = 'token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export const errorCode = (e: unknown): string =>
  axios.isAxiosError(e) ? (e.response?.data?.error ?? 'NETWORK_ERROR') : 'INTERNAL_ERROR';
