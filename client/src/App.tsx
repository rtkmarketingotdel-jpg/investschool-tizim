import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { brand } from '@/brand.config';
import { homeFor, useAuth } from '@/context/AuthContext';
import { RequireAuth, RoleGuard } from '@/components/RoleGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const Classes = lazy(() => import('@/pages/Classes'));
const Staff = lazy(() => import('@/pages/Staff'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const Me = lazy(() => import('@/pages/Me'));
const Settings = lazy(() => import('@/pages/Settings'));
const Payments = lazy(() => import('@/pages/finance/Payments'));
const Debtors = lazy(() => import('@/pages/finance/Debtors'));
const Payroll = lazy(() => import('@/pages/finance/Payroll'));
const Contracts = lazy(() => import('@/pages/finance/Contracts'));
const PublicContract = lazy(() => import('@/pages/PublicContract'));

const MGMT = ['DIRECTOR', 'ACCOUNTANT', 'ADMIN'] as const;

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'STAFF') return <Navigate to={homeFor('STAFF')} replace />;
  return <Dashboard />;
}

export default function App() {
  useEffect(() => {
    document.title = brand.name;
  }, []);

  return (
    <Suspense fallback={<Skeleton className="m-8 h-40" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/c/:token" element={<PublicContract />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/me" element={<Me />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route element={<RoleGuard roles={[...MGMT]} />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/students/*" element={<Students />} />
            <Route path="/finance/contracts" element={<Contracts />} />
          </Route>
          <Route element={<RoleGuard roles={['DIRECTOR', 'ADMIN']} />}>
            <Route path="/classes" element={<Classes />} />
            <Route path="/staff/*" element={<Staff />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<RoleGuard roles={['DIRECTOR', 'ACCOUNTANT']} />}>
            <Route path="/finance/payments" element={<Payments />} />
            <Route path="/finance/debtors" element={<Debtors />} />
            <Route path="/finance/payroll" element={<Payroll />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
