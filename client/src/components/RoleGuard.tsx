import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { homeFor, useAuth, type Role } from '@/context/AuthContext';
import { Skeleton } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton className="m-8 h-40" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
