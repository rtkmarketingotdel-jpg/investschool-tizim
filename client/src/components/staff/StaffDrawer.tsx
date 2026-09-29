import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { SUBJECTS } from '@/lib/constants';
import { generatePassword } from '@/lib/password';
import { maskPhone } from '@/lib/format';
import { schoolApi, type Role, type StaffMember } from '@/lib/schoolApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const schema = z.object({
  fullName: z.string().trim().min(3, 'errors.required'),
  phone: z.string().regex(/^\+998\d{9}$/, 'errors.phone'),
  role: z.enum(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF']),
  position: z.string().trim(),
  subject: z.string(),
  customSubject: z.string(),
  homeroomClassId: z.string(),
  branchId: z.string(),
  baseSalary: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { fullName: '', phone: '', role: 'STAFF', position: '', subject: '', customSubject: '', homeroomClassId: '', branchId: '', baseSalary: 4_000_000, isActive: true };
const OTHER = '__other';

interface Props {
  open: boolean;
  member: StaffMember | null;
  /** What "add" creates: a teacher (subject-based) or any other employee. */
  kind: 'teacher' | 'staff';
  onClose: () => void;
  onCreated: (creds: { name: string; phone: string; password: string }) => void;
}

export function StaffDrawer({ open, member, kind, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const roles: Role[] = user?.role === 'DIRECTOR' ? ['STAFF', 'ADMIN', 'ACCOUNTANT', 'DIRECTOR'] : ['STAFF', 'ADMIN'];
  const isTeacher = member ? member.isTeacher : kind === 'teacher';
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes, enabled: open && isTeacher });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches, enabled: open });

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setPassword(member ? '' : generatePassword());
    if (!member) return reset(empty);
    const known = member.subject && SUBJECTS.includes(member.subject);
    reset({
      fullName: member.fullName, phone: member.phone, role: member.role, position: member.position,
      subject: member.subject ? (known ? member.subject : OTHER) : '', customSubject: member.subject && !known ? member.subject : '',
      homeroomClassId: '', branchId: member.branchId ?? '', baseSalary: member.baseSalary, isActive: member.isActive,
    });
  }, [open, member, reset]);

  const subject = watch('subject');
  const passwordError = !member && password.length > 0 && password.length < 8;

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const subj = isTeacher ? (v.subject === OTHER ? v.customSubject.trim() : v.subject) || null : null;
      const body = {
        fullName: v.fullName, phone: v.phone, role: v.role, baseSalary: v.baseSalary, isActive: v.isActive,
        isTeacher, subject: subj,
        position: isTeacher && subj ? `${subj} oʻqituvchisi` : v.position,
        homeroomClassId: isTeacher && v.homeroomClassId ? v.homeroomClassId : null,
        branchId: v.branchId || null,
      };
      if (member) return schoolApi.updateStaff(member.id, body).then(() => null);
      return schoolApi.createStaff({ ...body, password: password || undefined });
    },
    onSuccess: (res, v) => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      void qc.invalidateQueries({ queryKey: ['classes'] });
      if (res) onCreated({ name: v.fullName, phone: v.phone, password: res.tempPassword });
      else toast(t('staff.updated'));
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);
  const locked = !!member && user?.role !== 'DIRECTOR' && (member.role === 'DIRECTOR' || member.role === 'ACCOUNTANT');
  const needsSubject = isTeacher && (!subject || (subject === OTHER && !watch('customSubject').trim()));
  const needsPosition = !isTeacher && !watch('position').trim();
  const title = member ? t('staff.edit') : t(isTeacher ? 'staff.addTeacher' : 'staff.add');

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit((v) => !passwordError && save.mutate(v))} className="space-y-4" noValidate>
        <Input label={t('staff.fullName')} error={err('fullName')} {...register('fullName')} />
        <Controller control={control} name="phone" render={({ field }) => <PhoneInput label={t('staff.phoneLogin')} value={field.value} onChange={field.onChange} error={err('phone')} />} />

        {isTeacher ? (
          <>
            <Select label={t('staff.subject')} {...register('subject')}>
              <option value="">—</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER}>{t('staff.otherSubject')}</option>
            </Select>
            {subject === OTHER && <Input label={t('staff.customSubject')} {...register('customSubject')} />}
            <Select label={t('staff.homeroom')} {...register('homeroomClassId')}>
              <option value="">{t('staff.noHomeroom')}</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.teacherName ? ` · ${c.teacherName}` : ''}</option>)}
            </Select>
          </>
        ) : (
          <Input label={t('staff.position')} error={err('position')} {...register('position')} />
        )}

        <Select label={t('staff.branch')} {...register('branchId')}>
          <option value="">{t('staff.anyBranch')}</option>
          {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select label={t('staff.role')} {...register('role')}>
          {roles.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
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
          <Button type="submit" loading={save.isPending} disabled={locked || needsSubject || needsPosition || passwordError} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
