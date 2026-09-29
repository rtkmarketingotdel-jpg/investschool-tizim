import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { schoolApi, type Role, type StaffMember } from '@/lib/schoolApi';
import { Avatar, Badge, Button, Modal, Select, Skeleton, Table, Td, Th, Thead, Tr, useToast } from '../ui';

export function UsersTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [secret, setSecret] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const list = useQuery({ queryKey: ['staff', 'settings'], queryFn: () => schoolApi.staff({ page: 1, limit: 100 }) });
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');

  const update = useMutation({
    mutationFn: ({ m, patch }: { m: StaffMember; patch: Partial<StaffMember> }) =>
      schoolApi.updateStaff(m.id, { fullName: m.fullName, phone: m.phone, role: m.role, position: m.position, baseSalary: m.baseSalary, isActive: m.isActive, isTeacher: m.isTeacher, isTutor: m.isTutor, subject: m.subject, branchId: m.branchId, ...patch }),
    onSuccess: () => { toast(t('staff.updated')); void qc.invalidateQueries({ queryKey: ['staff'] }); },
    onError: fail,
  });
  const reset = useMutation({
    mutationFn: (m: StaffMember) => schoolApi.resetPassword(m.id).then((r) => ({ r, m })),
    onSuccess: ({ r, m }) => setSecret({ name: m.fullName, password: r.tempPassword }),
    onError: fail,
  });

  if (list.isLoading) return <Skeleton className="h-64" />;
  return (
    <>
      <Table>
        <Thead>
          <tr><Th>{t('attendance.employee')}</Th><Th>{t('staff.role')}</Th><Th>{t('staff.statusCol')}</Th><Th><span className="sr-only">{t('common.actions')}</span></Th></tr>
        </Thead>
        <tbody>
          {list.data?.items.map((m) => (
            <Tr key={m.id}>
              <Td><div className="flex items-center gap-3"><Avatar name={m.fullName} size={40} /><div><p className="font-medium">{m.fullName}</p><p className="text-[13px] text-text-muted">{m.phone}</p></div></div></Td>
              <Td className="w-56">
                <Select aria-label={t('staff.role')} value={m.role} disabled={m.id === user?.id} onChange={(e) => update.mutate({ m, patch: { role: e.target.value as Role } })}>
                  {(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF'] as Role[]).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                </Select>
              </Td>
              <Td><Badge tone={m.isActive ? 'success' : 'danger'}>{t(m.isActive ? 'staff.active' : 'staff.inactive')}</Badge></Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" className="px-3 py-2 text-sm" disabled={m.id === user?.id} onClick={() => update.mutate({ m, patch: { isActive: !m.isActive } })}>{t(m.isActive ? 'settings.users.deactivate' : 'settings.users.activate')}</Button>
                  <button aria-label={t('staff.resetPassword')} title={t('staff.resetPassword')} onClick={() => reset.mutate(m)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><KeyRound className="h-4 w-4" /></button>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Modal open={!!secret} onClose={() => setSecret(null)} title={t('staff.tempPasswordTitle')}>
        <p className="text-text-muted">{t('staff.tempPasswordText', { name: secret?.name })}</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
          <code className="flex-1 select-all text-lg font-medium tracking-wider">{secret?.password}</code>
          <Button variant="secondary" className="px-3 py-2" aria-label={t('common.copy')} onClick={async () => { await navigator.clipboard.writeText(secret!.password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-3 text-sm text-text-muted">{t('staff.tempPasswordWarning')}</p>
        <Button className="mt-6 w-full" onClick={() => setSecret(null)}>{t('common.close')}</Button>
      </Modal>
    </>
  );
}
