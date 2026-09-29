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

const ALL_MGMT: Role[] = ['DIRECTOR', 'ACCOUNTANT', 'ADMIN'];

export const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.main',
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ALL_MGMT, end: true }],
  },
  {
    titleKey: 'nav.students',
    items: [
      { to: '/students', labelKey: 'nav.studentsList', icon: GraduationCap, roles: ALL_MGMT },
      { to: '/classes', labelKey: 'nav.classes', icon: School, roles: ['DIRECTOR', 'ADMIN'] },
      { to: '/academics', labelKey: 'nav.academics', icon: BookOpen, roles: ['DIRECTOR', 'ADMIN'] },
    ],
  },
  {
    titleKey: 'nav.staff',
    items: [
      { to: '/staff', labelKey: 'nav.staffList', icon: Users, roles: ['DIRECTOR', 'ADMIN'] },
      { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, roles: [...ALL_MGMT, 'STAFF'] },
    ],
  },
  {
    titleKey: 'nav.finance',
    items: [
      { to: '/finance/payments', labelKey: 'nav.payments', icon: Wallet, roles: ['DIRECTOR', 'ACCOUNTANT'] },
      { to: '/finance/debtors', labelKey: 'nav.debtors', icon: AlertCircle, roles: ['DIRECTOR', 'ACCOUNTANT'] },
      { to: '/finance/payroll', labelKey: 'nav.payroll', icon: Banknote, roles: ['DIRECTOR', 'ACCOUNTANT'] },
      { to: '/finance/contracts', labelKey: 'nav.contracts', icon: FileSignature, roles: ALL_MGMT },
    ],
  },
  {
    titleKey: 'nav.communication',
    items: [{ to: '/sms', labelKey: 'nav.sms', icon: MessageSquare, roles: ['DIRECTOR', 'ACCOUNTANT', 'ADMIN'] }],
  },
  {
    titleKey: 'nav.management',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings, roles: ['DIRECTOR', 'ADMIN'] }],
  },
];
