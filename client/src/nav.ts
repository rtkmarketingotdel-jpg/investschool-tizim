import {
  LayoutDashboard, GraduationCap, School, Users, CalendarCheck, Wallet, AlertCircle,
  Banknote, BookOpen, FileSignature, MessageSquare, Settings, type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/context/AuthContext';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles: Role[];
  end?: boolean;
}
export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const ALL_MGMT: Role[] = ['DIRECTOR', 'MANAGER', 'ACCOUNTANT'];
const MGMT: Role[] = ['DIRECTOR', 'MANAGER'];

export const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.main',
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ALL_MGMT, end: true }],
  },
  {
    titleKey: 'nav.students',
    items: [
      { to: '/students', labelKey: 'nav.studentsList', icon: GraduationCap, roles: ALL_MGMT },
      { to: '/classes', labelKey: 'nav.classes', icon: School, roles: MGMT },
      { to: '/academics', labelKey: 'nav.academics', icon: BookOpen, roles: MGMT },
    ],
  },
  {
    titleKey: 'nav.staff',
    items: [
      { to: '/staff', labelKey: 'nav.staffList', icon: Users, roles: MGMT },
      { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, roles: [...ALL_MGMT, 'TEACHER'] },
    ],
  },
  {
    titleKey: 'nav.finance',
    items: [
      { to: '/finance/payments', labelKey: 'nav.payments', icon: Wallet, roles: ALL_MGMT },
      { to: '/finance/debtors', labelKey: 'nav.debtors', icon: AlertCircle, roles: ALL_MGMT },
      { to: '/finance/payroll', labelKey: 'nav.payroll', icon: Banknote, roles: ALL_MGMT },
      { to: '/finance/contracts', labelKey: 'nav.contracts', icon: FileSignature, roles: ALL_MGMT },
    ],
  },
  {
    titleKey: 'nav.communication',
    items: [{ to: '/sms', labelKey: 'nav.sms', icon: MessageSquare, roles: ALL_MGMT }],
  },
  {
    titleKey: 'nav.management',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings, roles: MGMT }],
  },
];
