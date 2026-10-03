import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { brand } from '@/brand.config';
import { homeFor, useAuth } from '@/context/AuthContext';
import { RequireAuth, RoleGuard } from '@/components/RoleGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui';

// One loader per page: used both for lazy() and for background preloading (no wait when the user navigates).
const loaders = {
  Login: () => import('@/pages/Login'),
  Dashboard: () => import('@/pages/Dashboard'),
  Students: () => import('@/pages/Students'),
  StudentDetail: () => import('@/pages/StudentDetail'),
  Classes: () => import('@/pages/Classes'),
  Academics: () => import('@/pages/Academics'),
  Sms: () => import('@/pages/Sms'),
  Profile: () => import('@/pages/Profile'),
  ProfileSetup: () => import('@/pages/ProfileSetup'),
  Staff: () => import('@/pages/Staff'),
  StaffDetail: () => import('@/pages/StaffDetail'),
  Attendance: () => import('@/pages/Attendance'),
  Me: () => import('@/pages/Me'),
  Settings: () => import('@/pages/Settings'),
  Payments: () => import('@/pages/finance/Payments'),
  Debtors: () => import('@/pages/finance/Debtors'),
  Payroll: () => import('@/pages/finance/Payroll'),
  Contracts: () => import('@/pages/finance/Contracts'),
  ContractClass: () => import('@/pages/finance/ContractClass'),
  PublicContract: () => import('@/pages/PublicContract'),
};
const Login = lazy(loaders.Login);
const Dashboard = lazy(loaders.Dashboard);
const Students = lazy(loaders.Students);
const StudentDetail = lazy(loaders.StudentDetail);
const Classes = lazy(loaders.Classes);
const Academics = lazy(loaders.Academics);
const Sms = lazy(loaders.Sms);
const Profile = lazy(loaders.Profile);
const ProfileSetup = lazy(loaders.ProfileSetup);
const Staff = lazy(loaders.Staff);
const StaffDetail = lazy(loaders.StaffDetail);
const Attendance = lazy(loaders.Attendance);
const Me = lazy(loaders.Me);
const Settings = lazy(loaders.Settings);
const Payments = lazy(loaders.Payments);
const Debtors = lazy(loaders.Debtors);
const Payroll = lazy(loaders.Payroll);
const Contracts = lazy(loaders.Contracts);
const ContractClass = lazy(loaders.ContractClass);
const PublicContract = lazy(loaders.PublicContract);

const MGMT = ['DIRECTOR', 'MANAGER'] as const;

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'TEACHER') return <Navigate to={homeFor('TEACHER')} replace />;
  return <Dashboard />;
}

export default function App() {
  const { user } = useAuth();
  useEffect(() => {
    document.title = brand.name;
  }, []);

  // After sign-in, fetch every page chunk when the browser is idle so navigation is instant.
  useEffect(() => {
    if (!user) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 800));
    idle(() => Object.entries(loaders).forEach(([name, load]) => name !== 'PublicContract' && void load().catch(() => undefined)));
  }, [user]);

  return (
    <Suspense fallback={<Skeleton className="m-8 h-40" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/c/:token" element={<PublicContract />} />
        <Route path="/profile/setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/me" element={<Me />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route element={<RoleGuard roles={[...MGMT]} />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/sms" element={<Sms />} />
            <Route path="/finance/contracts" element={<Contracts />} />
            <Route path="/finance/contracts/class/:classId" element={<ContractClass />} />
          </Route>
          <Route element={<RoleGuard roles={['DIRECTOR', 'MANAGER']} />}>
            <Route path="/classes" element={<Classes />} />
            <Route path="/academics" element={<Academics />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/:id" element={<StaffDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<RoleGuard roles={['DIRECTOR', 'MANAGER']} />}>
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
