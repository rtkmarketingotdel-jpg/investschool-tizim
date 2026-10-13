import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { generatePassword } from '@/lib/password';
import { maskPhone } from '@/lib/format';
import { schoolApi, type Role, type StaffMember } from '@/lib/schoolApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const schema = z.object({
  fullName: z.string().trim().min(3, 'errors.required').max(120, 'errors.tooLong'),
  phone: z.string().regex(/^\+998\d{9}$/, 'errors.phone'),
  role: z.enum(['DIRECTOR', 'MANAGER', 'ACCOUNTANT', 'TEACHER']),
  position: z.string().trim().max(120, 'errors.tooLong'),
  specialty: z.string(),
  customSpecialty: z.string(),
  branchId: z.string(),
  baseSalary: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { fullName: '', phone: '', role: 'TEACHER', position: '', specialty: '', customSpecialty: '', branchId: '', baseSalary: 4_000_000, isActive: true };
const OTHER = '__other';
type StaffType = 'manager' | 'accountant' | 'teacher';
const toType = (k: string): StaffType => (k === 'teacher' || k === 'accountant' ? k : 'manager');

interface Props {
  open: boolean;
  member: StaffMember | null;
  /** What "add" creates: a teacher (course-based) or any other employee. */
  kind: 'teacher' | 'staff';
  onClose: () => void;
  onCreated: (creds: { name: string; phone: string; password: string }) => void;
}

export function StaffDrawer({ open, member, kind, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  // The employee type can be changed at any time (e.g. a plain employee becomes a teacher): the cabinet follows it.
  const [type, setType] = useState<StaffType>(toType(kind));
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const isTeacher = type === 'teacher';
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const groups = useQuery({ queryKey: ['groups'], queryFn: schoolApi.groups, enabled: open && isTeacher });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches, enabled: open });
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses, enabled: open && isTeacher });
  const courseNames = (coursesQ.data ?? []).map((c) => c.name);
  // finished groups are history: offer only the ones the teacher still leads
  const groupOptions = (groups.data ?? []).filter((g) => g.status !== 'FINISHED' || groupIds.includes(g.id));

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setType(member ? (member.isTeacher ? 'teacher' : member.role === 'ACCOUNTANT' ? 'accountant' : 'manager') : toType(kind));
    setGroupIds([]);
    setPassword(member ? '' : generatePassword());
    if (!member) return reset(empty);
    const known = member.specialty && (coursesQ.data ?? []).some((x) => x.name === member.specialty);
    reset({
      fullName: member.fullName, phone: member.phone, role: member.role, position: member.position,
      specialty: member.specialty ? (known ? member.specialty : OTHER) : '', customSpecialty: member.specialty && !known ? member.specialty : '',
      branchId: member.branchId ?? '', baseSalary: member.baseSalary, isActive: member.isActive,
    });
  }, [open, member, kind, reset, coursesQ.data]);

  useEffect(() => {
    if (open && member && groups.data) setGroupIds(groups.data.filter((g) => g.teacherId === member.id).map((g) => g.id));
  }, [open, member, groups.data]);

  const specialty = watch('specialty');
  const passwordError = !member && password.length > 0 && password.length < 8;

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const spec = isTeacher ? (v.specialty === OTHER ? v.customSpecialty.trim() : v.specialty) || null : null;
      const body = {
        fullName: v.fullName, phone: v.phone, role: member?.role === 'DIRECTOR' ? ('DIRECTOR' as Role) : type === 'manager' ? ('MANAGER' as Role) : type === 'accountant' ? ('ACCOUNTANT' as Role) : ('TEACHER' as Role), baseSalary: v.baseSalary, isActive: v.isActive,
        isTeacher, specialty: spec,
        position: spec ? `${spec} oʻqituvchisi` : v.position,
        branchId: v.branchId || null,
        // the list is known only once the groups are loaded; without it the server keeps the current assignment
        ...(isTeacher && groups.data ? { groupIds } : {}),
      };
      if (member) return schoolApi.updateStaff(member.id, body).then(() => null);
      return schoolApi.createStaff({ ...body, password: password || undefined });
    },
    onSuccess: (res, v) => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
      if (res) onCreated({ name: v.fullName, phone: v.phone, password: res.tempPassword });
      else toast(t('staff.updated'));
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);
  const locked = !!member && user?.role !== 'DIRECTOR' && member.role === 'DIRECTOR';
  const needsSpecialty = isTeacher && (!specialty || (specialty === OTHER && !watch('customSpecialty').trim()));
  const needsPosition = !isTeacher && !watch('position').trim();
  const title = member ? t('staff.edit') : t('staff.add');

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit((v) => !passwordError && save.mutate(v))} className="space-y-4" noValidate>
        <Input label={t('staff.fullName')} error={err('fullName')} {...register('fullName')} />
        <Controller control={control} name="phone" render={({ field }) => <PhoneInput label={t('staff.phoneLogin')} value={field.value} onChange={field.onChange} error={err('phone')} />} />

        {member?.role !== 'DIRECTOR' && (
          <Select label={t('staff.roleChoose')} value={type} onChange={(e) => setType(e.target.value as StaffType)}>
            <option value="teacher">{t('staff.types.teacher')}</option>
            <option value="manager">{t('staff.types.manager')}</option>
            <option value="accountant">{t('staff.types.accountant')}</option>
          </Select>
        )}

        {isTeacher ? (
          <>
            <Select label={`${t('staff.specialty')} *`} {...register('specialty')}>
              <option value="">—</option>
              {courseNames.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value={OTHER}>{t('staff.otherSpecialty')}</option>
            </Select>
            {specialty === OTHER && <Input label={t('staff.customSpecialty')} {...register('customSpecialty')} />}
            <div>
              <span className="mb-1.5 block text-sm">{t('staff.groupsLed')}</span>
              <div className="flex flex-wrap gap-2">
                {groupOptions.map((g) => {
                  const on = groupIds.includes(g.id);
                  const taken = !on && g.teacherId && g.teacherId !== member?.id ? g.teacherName : null;
                  return (
                    <button key={g.id} type="button" aria-pressed={on} title={taken ? t('staff.groupTakenBy', { name: taken }) : g.courseName} onClick={() => setGroupIds(on ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id])}
                      className={`rounded-full border px-4 py-2 text-sm transition ${on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted'}`}>
                      {g.name}{taken ? ' *' : ''}
                    </button>
                  );
                })}
                {groups.data && groupOptions.length === 0 && <p className="text-sm text-text-muted">{t('staff.noGroups')}</p>}
              </div>
              <p className="mt-1.5 text-xs text-text-muted">{t('staff.groupsLedHint')}</p>
            </div>
          </>
        ) : (
          <Input label={t('staff.position')} error={err('position')} {...register('position')} />
        )}

        <Select label={t('staff.branch')} {...register('branchId')}>
          <option value="">{t('staff.anyBranch')}</option>
          {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Input type="number" min={0} step={100000} label={t('staff.baseSalary')} error={err('baseSalary')} {...register('baseSalary', { valueAsNumber: true })} />
        {member && <Controller control={control} name="isActive" render={({ field }) => <Checkbox label={t('staff.active')} checked={field.value} onChange={field.onChange} />} />}

        {!member && (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm text-text-muted">{t('staff.credentialsHint')}</p>
            <Input label={t('staff.login')} value={watch('phone') ? maskPhone(watch('phone')) : '+998'} readOnly aria-readonly />
            <div className="mt-3">
              <Input label={t('staff.password')} value={password} error={passwordError ? t('staff.passwordMin') : undefined} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" className="px-4 py-2 text-sm" onClick={() => setPassword(generatePassword())}><RefreshCw className="h-4 w-4" /> {t('staff.generate')}</Button>
              <Button type="button" variant="secondary" className="px-4 py-2 text-sm" disabled={!password} onClick={async () => { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t('common.copy')}
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} disabled={locked || needsSpecialty || needsPosition || passwordError} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
