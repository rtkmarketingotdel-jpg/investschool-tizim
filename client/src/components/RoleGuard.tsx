import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth, type Role } from '@/context/AuthContext';
import { Skeleton } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Skeleton className="m-8 h-40" />;
  if (!user) return <Navigate to="/login" replace />;
  // first sign-in: everybody except the director completes the profile before using the system
  if (user.role !== 'DIRECTOR' && !user.profileCompletedAt && pathname !== '/profile/setup') return <Navigate to="/profile/setup" replace />;
  return <>{children}</>;
}

export function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
