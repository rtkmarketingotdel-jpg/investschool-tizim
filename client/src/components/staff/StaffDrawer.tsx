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
  fullName: z.string().trim().min(3, 'errors.required'),
  phone: z.string().regex(/^\+998\d{9}$/, 'errors.phone'),
  role: z.enum(['DIRECTOR', 'MANAGER', 'TEACHER']),
  position: z.string().trim(),
  subject: z.string(),
  customSubject: z.string(),
  homeroomClassId: z.string(),
  branchId: z.string(),
  baseSalary: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { fullName: '', phone: '', role: 'TEACHER', position: '', subject: '', customSubject: '', homeroomClassId: '', branchId: '', baseSalary: 4_000_000, isActive: true };
const OTHER = '__other';
type StaffType = 'manager' | 'teacher' | 'tutor';
const toType = (k: string): StaffType => (k === 'teacher' ? 'teacher' : k === 'tutor' ? 'tutor' : 'manager');

interface Props {
  open: boolean;
  member: StaffMember | null;
  /** What "add" creates: a teacher (subject-based) or any other employee. */
  kind: 'teacher' | 'tutor' | 'staff';
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
  const [clubIds, setClubIds] = useState<string[]>([]);
  const isTeacher = type === 'teacher';
  const isTutor = type === 'tutor';
  const hasSubject = isTeacher || isTutor;
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes, enabled: open && isTeacher });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches, enabled: open });
  const clubsQ = useQuery({ queryKey: ['clubs'], queryFn: schoolApi.clubs, enabled: open && isTutor });
  const subjectsQ = useQuery({ queryKey: ['subjects'], queryFn: schoolApi.subjects, enabled: open && hasSubject });
  const subjectNames = (subjectsQ.data ?? []).map((s) => s.name);

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setType(member ? (member.isTeacher ? 'teacher' : member.isTutor ? 'tutor' : 'manager') : toType(kind));
    setClubIds([]);
    setPassword(member ? '' : generatePassword());
    if (!member) return reset(empty);
    const known = member.subject && (subjectsQ.data ?? []).some((x) => x.name === member.subject);
    reset({
      fullName: member.fullName, phone: member.phone, role: member.role, position: member.position,
      subject: member.subject ? (known ? member.subject : OTHER) : '', customSubject: member.subject && !known ? member.subject : '',
      homeroomClassId: '', branchId: member.branchId ?? '', baseSalary: member.baseSalary, isActive: member.isActive,
    });
  }, [open, member, kind, reset, subjectsQ.data]);

  useEffect(() => {
    if (open && member && clubsQ.data) setClubIds(clubsQ.data.filter((c) => c.teacherId === member.id).map((c) => c.id));
  }, [open, member, clubsQ.data]);

  const subject = watch('subject');
  const passwordError = !member && password.length > 0 && password.length < 8;

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const subj = hasSubject ? (v.subject === OTHER ? v.customSubject.trim() : v.subject) || null : null;
      const body = {
        fullName: v.fullName, phone: v.phone, role: member?.role === 'DIRECTOR' ? ('DIRECTOR' as Role) : type === 'manager' ? ('MANAGER' as Role) : ('TEACHER' as Role), baseSalary: v.baseSalary, isActive: v.isActive,
        isTeacher, isTutor, subject: subj,
        position: subj && isTeacher ? `${subj} oʻqituvchisi` : subj && isTutor ? `${subj} repetitori` : v.position,
        homeroomClassId: isTeacher && v.homeroomClassId ? v.homeroomClassId : null,
        branchId: v.branchId || null,
        ...(isTutor ? { clubIds } : {}),
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
  const locked = !!member && user?.role !== 'DIRECTOR' && member.role === 'DIRECTOR';
  const needsSubject = hasSubject && (!subject || (subject === OTHER && !watch('customSubject').trim()));
  const needsPosition = !hasSubject && !watch('position').trim();
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
            <option value="tutor">{t('staff.types.tutor')}</option>
          </Select>
        )}

        {hasSubject ? (
          <>
            <Select label={`${t('staff.subject')} *`} {...register('subject')}>
              <option value="">—</option>
              {subjectNames.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER}>{t('staff.otherSubject')}</option>
            </Select>
            {subject === OTHER && <Input label={t('staff.customSubject')} {...register('customSubject')} />}
            {isTutor && (
              <div>
                <span className="mb-1.5 block text-sm">{t('staff.tutorClubs')}</span>
                <div className="flex flex-wrap gap-2">
                  {(clubsQ.data ?? []).map((c) => {
                    const on = clubIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on} onClick={() => setClubIds(on ? clubIds.filter((x) => x !== c.id) : [...clubIds, c.id])}
                        className={`rounded-full border px-4 py-2 text-sm transition ${on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted'}`}>
                        {c.name}
                      </button>
                    );
                  })}
                  {clubsQ.data?.length === 0 && <p className="text-sm text-text-muted">{t('staff.noClubs')}</p>}
                </div>
              </div>
            )}
            {isTeacher && <Select label={t('staff.homeroom')} {...register('homeroomClassId')}>
              <option value="">{t('staff.noHomeroom')}</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.teacherName ? ` · ${c.teacherName}` : ''}</option>)}
            </Select>}
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
          <Button type="submit" loading={save.isPending} disabled={locked || needsSubject || needsPosition || passwordError} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
