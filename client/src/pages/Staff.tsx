import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check, Copy, GraduationCap, KeyRound, Pencil, Plus, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { schoolApi, type Role, type StaffMember } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { useDebounce } from '@/lib/useDebounce';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { StaffDrawer } from '@/components/staff/StaffDrawer';
import { Avatar, Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Table, Td, Th, Thead, Tr, useToast } from '@/components/ui';

const LIMIT = 20;

export default function Staff() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ open: boolean; member: StaffMember | null; kind: 'teacher' | 'tutor' | 'staff' }>({ open: false, member: null, kind: 'staff' });
  const [type, setType] = useState('');
  const [secret, setSecret] = useState<{ name: string; phone: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [copied, setCopied] = useState(false);
  // /staff?add=tutor|teacher opens the matching add drawer (used by the Academics page)
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const k = params.get('add');
    if (k === 'tutor' || k === 'teacher' || k === 'staff') {
      setDrawer({ open: true, member: null, kind: k });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });
  const branchName = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
  const list = useQuery({
    queryKey: ['staff', q, role, active, type, page],
    queryFn: () => schoolApi.staff({ q, role, active, teacher: type === 'teacher' ? 'true' : undefined, tutor: type === 'tutor' ? 'true' : undefined, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const reset = useMutation({
    mutationFn: (m: StaffMember) => schoolApi.resetPassword(m.id),
    onSuccess: (r, m) => {
      setResetTarget(null);
      setSecret({ name: m.fullName, phone: m.phone, password: r.tempPassword });
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const copy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(`${t('staff.login')}: ${secret.phone}\n${t('staff.password')}: ${secret.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const canManage = (m: StaffMember) => user?.role === 'DIRECTOR' || (m.role !== 'DIRECTOR' && m.role !== 'ACCOUNTANT');
  const rows = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t('nav.staffList')}
        subtitle={t('staff.subtitle', { count: list.data?.total ?? 0 })}
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDrawer({ open: true, member: null, kind: 'staff' })}><Plus className="h-5 w-5" /> {t('staff.add')}</Button>
            <Button variant="secondary" onClick={() => setDrawer({ open: true, member: null, kind: 'tutor' })}><BookOpen className="h-5 w-5" /> {t('staff.addTutor')}</Button>
            <Button onClick={() => setDrawer({ open: true, member: null, kind: 'teacher' })}><GraduationCap className="h-5 w-5" /> {t('staff.addTeacher')}</Button>
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <Input aria-label={t('common.search')} placeholder={t('staff.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="w-44">
          <Select aria-label={t('staff.role')} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">{t('staff.allRoles')}</option>
            {(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF'] as Role[]).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
          </Select>
        </div>
        <div className="w-44">
          <Select aria-label={t('staff.type')} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">{t('staff.allTypes')}</option>
            <option value="teacher">{t('staff.teachersOnly')}</option>
            <option value="tutor">{t('staff.tutorsOnly')}</option>
          </Select>
        </div>
        <div className="w-44">
          <Select aria-label={t('staff.statusCol')} value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
            <option value="">{t('staff.allStatuses')}</option>
            <option value="true">{t('staff.active')}</option>
            <option value="false">{t('staff.inactive')}</option>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : list.isError ? (
        <EmptyState icon={Users} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={t('staff.empty')} />
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th className="w-16">№</Th>
                <Th>{t('staff.fullName')}</Th>
                <Th>{t('staff.position')}</Th>
                <Th>{t('staff.branch')}</Th>
                <Th>{t('staff.role')}</Th>
                <Th numeric>{t('staff.baseSalary')}</Th>
                <Th>{t('staff.thisMonth')}</Th>
                <Th>{t('staff.statusCol')}</Th>
                <Th className="w-28"><span className="sr-only">{t('common.actions')}</span></Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((m, i) => (
                <Tr key={m.id} className="cursor-pointer" onClick={() => navigate(`/staff/${m.id}`)}>
                  <Td className="text-text-muted">{(page - 1) * LIMIT + i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.fullName} size={44} src={m.photoUrl} />
                      <div>
                        <Link to={`/staff/${m.id}`} className="font-medium hover:text-primary">{m.fullName}</Link>
                        <p className="text-[13px] text-text-muted">{m.phone}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{m.position}</Td>
                  <Td className="text-text-muted">{m.branchId ? (branchName.get(m.branchId) ?? '—') : t('staff.anyBranch')}</Td>
                  <Td><Badge>{t(`roles.${m.role}`)}</Badge></Td>
                  <Td numeric>{formatMoney(m.baseSalary, t('common.currency'))}</Td>
                  <Td className="whitespace-nowrap text-sm">
                    <span className="text-amber-600 dark:text-amber-400">{t('staff.lateShort', { count: m.lateCount })}</span>
                    {' · '}
                    <span className="text-red-600">{t('staff.absentShort', { count: m.absentCount })}</span>
                  </Td>
                  <Td><Badge tone={m.isActive ? 'success' : 'danger'}>{t(m.isActive ? 'staff.active' : 'staff.inactive')}</Badge></Td>
                  <Td>
                    {canManage(m) && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button aria-label={t('staff.edit')} onClick={() => setDrawer({ open: true, member: m, kind: m.isTeacher ? 'teacher' : m.isTutor ? 'tutor' : 'staff' })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={t('staff.resetPassword')} onClick={() => setResetTarget(m)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><KeyRound className="h-4 w-4" /></button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}

      <StaffDrawer open={drawer.open} member={drawer.member} kind={drawer.kind} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onCreated={setSecret} />

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={t('staff.resetPassword')}>
        <p className="text-text-muted">{t('staff.resetConfirm', { name: resetTarget?.fullName })}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setResetTarget(null)}>{t('common.cancel')}</Button>
          <Button className="flex-1" loading={reset.isPending} onClick={() => resetTarget && reset.mutate(resetTarget)}>{t('staff.resetPassword')}</Button>
        </div>
      </Modal>

      <Modal open={!!secret} onClose={() => setSecret(null)} title={t('staff.tempPasswordTitle')}>
        <p className="text-text-muted">{t('staff.tempPasswordText', { name: secret?.name })}</p>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2"><dt className="w-16 text-text-muted">{t('staff.login')}</dt><dd className="select-all">{secret?.phone}</dd></div>
        </dl>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
          <code className="flex-1 select-all text-lg tracking-wider">{secret?.password}</code>
          <Button variant="secondary" className="px-3 py-2" onClick={copy} aria-label={t('common.copy')}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-3 text-sm text-text-muted">{t('staff.tempPasswordWarning')}</p>
        <Button className="mt-6 w-full" onClick={() => setSecret(null)}>{t('common.close')}</Button>
      </Modal>
    </div>
  );
}
