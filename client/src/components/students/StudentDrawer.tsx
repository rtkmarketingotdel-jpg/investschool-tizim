import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { DISTRICTS } from '@/lib/constants';
import { errorCode } from '@/lib/api';
import { schoolApi, type Student, type StudentInput } from '@/lib/schoolApi';
import { todayLocal } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { FormSection, Textarea } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const phone = z.string().regex(/^\+998\d{9}$/, 'errors.phone');
const schema = z.object({
  lastName: z.string().trim().min(1, 'errors.required').max(60, 'errors.tooLong'),
  firstName: z.string().trim().min(1, 'errors.required').max(60, 'errors.tooLong'),
  middleName: z.string().max(60, 'errors.tooLong'),
  birthDate: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  phone,
  phone2: z.string().refine((v) => v === '' || /^\+998\d{9}$/.test(v), 'errors.phone'),
  passport: z.string().refine((v) => v.trim() === '' || /^[A-Za-z]{2}\s?\d{7}$/.test(v.trim()), 'errors.passport'),
  pinfl: z.string().refine((v) => v.trim() === '' || /^\d{14}$/.test(v.trim()), 'errors.pinfl'),
  district: z.string(),
  address: z.string().max(500, 'errors.tooLong'),
  courseId: z.string(),
  groupId: z.string(),
  coursePrice: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  discountPercent: z.number({ invalid_type_error: 'errors.required' }).int().min(0).max(100),
  status: z.enum(['ACTIVE', 'GRADUATED', 'LEFT']),
  enrolledAt: z.string().min(1, 'errors.required'),
  notes: z.string().max(500, 'errors.tooLong'),
});
type FormValues = z.infer<typeof schema>;

const empty = (): FormValues => ({
  lastName: '', firstName: '', middleName: '', birthDate: '', gender: 'MALE', phone: '', phone2: '', passport: '', pinfl: '',
  district: '', address: '', courseId: '', groupId: '', coursePrice: 0, discountPercent: 0, status: 'ACTIVE', enrolledAt: todayLocal(), notes: '',
});

const fromStudent = (s: Student): FormValues => ({
  lastName: s.lastName, firstName: s.firstName, middleName: s.middleName ?? '', birthDate: s.birthDate ?? '', gender: s.gender,
  phone: s.phone, phone2: s.phone2 ?? '', passport: s.passport ?? '', pinfl: s.pinfl ?? '', district: s.district ?? '', address: s.address ?? '',
  courseId: s.courseId ?? '', groupId: s.groupId ?? '', coursePrice: s.coursePrice, discountPercent: s.discountPercent, status: s.status,
  enrolledAt: s.enrolledAt, notes: s.notes ?? '',
});

const toInput = ({ courseId: _course, ...v }: FormValues): StudentInput => {
  void _course; // the course follows from the group
  return {
    ...v,
    middleName: v.middleName || null,
    birthDate: v.birthDate || null,
    groupId: v.groupId || null,
    phone2: v.phone2 || null,
    passport: v.passport.replace(/\s/g, '').toUpperCase() || null,
    pinfl: v.pinfl.trim() || null,
    district: v.district || null,
    address: v.address || null,
    notes: v.notes || null,
  };
};

interface Props {
  open: boolean;
  student: Student | null; // null = create
  onClose: () => void;
  onSaved?: (s: Student) => void;
}

export function StudentDrawer({ open, student, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const groups = useQuery({ queryKey: ['groups'], queryFn: schoolApi.groups, enabled: open });
  const courses = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses, enabled: open });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: empty(),
  });
  useEffect(() => {
    if (open) reset(student ? fromStudent(student) : empty());
  }, [open, student, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      student ? schoolApi.updateStudent(student.id, toInput(v)) : schoolApi.createStudent(toInput(v)),
    onSuccess: (s) => {
      toast(t(student ? 'students.updated' : 'students.created'));
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['student', s.id] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
      onSaved?.(s);
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const courseId = watch('courseId');
  const groupId = watch('groupId');
  const status = watch('status');
  const price = watch('coursePrice');
  const discount = watch('discountPercent');
  // a new trainee joins a running or upcoming group; an existing one keeps showing their (maybe finished) group
  const groupOptions = (groups.data ?? []).filter(
    (g) => (!courseId || g.courseId === courseId) && (g.status !== 'FINISHED' || g.id === student?.groupId),
  );
  const chosen = groups.data?.find((g) => g.id === groupId);
  const isCurrent = !!student && student.groupId === groupId && student.status !== 'LEFT';
  const groupFull = !!chosen && chosen.freeSeats === 0 && !isCurrent && status !== 'LEFT';
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);

  /** Picking a group fixes the course; for a new enrolment the price starts at the course price. */
  const pickGroup = (id: string) => {
    setValue('groupId', id);
    const g = groups.data?.find((x) => x.id === id);
    if (!g) return;
    setValue('courseId', g.courseId);
    const coursePrice = courses.data?.find((c) => c.id === g.courseId)?.price;
    if (coursePrice !== undefined && (!student || student.groupId !== id)) setValue('coursePrice', coursePrice);
  };
  const pickCourse = (id: string) => {
    setValue('courseId', id);
    if (chosen && chosen.courseId !== id) setValue('groupId', '');
    const coursePrice = courses.data?.find((c) => c.id === id)?.price;
    if (coursePrice !== undefined && !student) setValue('coursePrice', coursePrice);
  };

  return (
    <Drawer open={open} onClose={onClose} title={t(student ? 'students.edit' : 'students.add')}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-8" noValidate>
        <FormSection title={t('students.sections.student')}>
          <Input label={t('students.lastName')} error={err('lastName')} {...register('lastName')} />
          <Input label={t('students.firstName')} error={err('firstName')} {...register('firstName')} />
          <Input label={t('students.middleName')} {...register('middleName')} />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label={t('students.birthDate')} {...register('birthDate')} />
            <Select label={t('students.gender')} {...register('gender')}>
              <option value="MALE">{t('students.male')}</option>
              <option value="FEMALE">{t('students.female')}</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('students.passport')} placeholder="AB1234567" maxLength={10} error={err('passport')} {...register('passport')} />
            <Input label={t('students.pinfl')} inputMode="numeric" maxLength={14} error={err('pinfl')} {...register('pinfl')} />
          </div>
        </FormSection>

        <FormSection title={t('students.sections.contacts')}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => <PhoneInput label={t('students.phone')} value={field.value} onChange={field.onChange} error={err('phone')} />}
          />
          <Controller
            control={control}
            name="phone2"
            render={({ field }) => <PhoneInput label={t('students.phone2')} value={field.value} onChange={field.onChange} error={err('phone2')} />}
          />
          <Select label={t('students.district')} {...register('district')}>
            <option value="">—</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Input label={t('students.address')} {...register('address')} />
        </FormSection>

        <FormSection title={t('students.sections.study')}>
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('students.course')} value={courseId} onChange={(e) => pickCourse(e.target.value)}>
              <option value="">—</option>
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label={t('students.group')} value={groupId} onChange={(e) => pickGroup(e.target.value)}>
              <option value="">{t('students.noGroup')}</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {t(`groups.statuses.${g.status}`)} · {t('groups.free', { count: g.freeSeats })}
                </option>
              ))}
            </Select>
          </div>
          {groupFull && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm text-[#B45309] dark:bg-amber-500/15 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {t('students.groupFullWarning')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('students.status')} {...register('status')}>
              <option value="ACTIVE">{t('students.statuses.ACTIVE')}</option>
              <option value="GRADUATED">{t('students.statuses.GRADUATED')}</option>
              <option value="LEFT">{t('students.statuses.LEFT')}</option>
            </Select>
            <Input type="date" label={t('students.enrolledAt')} error={err('enrolledAt')} {...register('enrolledAt')} />
          </div>
        </FormSection>

        <FormSection title={t('students.sections.payment')}>
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min={0} step={100000} label={t('students.coursePrice')} error={err('coursePrice')} {...register('coursePrice', { valueAsNumber: true })} />
            <Input type="number" min={0} max={100} label={t('students.discount')} error={err('discountPercent')} {...register('discountPercent', { valueAsNumber: true })} />
          </div>
          {Number.isFinite(price) && Number.isFinite(discount) && (
            <p className="text-sm text-text-muted">
              {t('students.toPay')}: <span className="font-medium text-text">{formatMoney(Math.round((price * (100 - discount)) / 100), t('common.currency'))}</span>
            </p>
          )}
          {status === 'LEFT' && <p className="text-sm text-text-muted">{t('students.leftPriceHint')}</p>}
          <Textarea label={t('students.notes')} {...register('notes')} />
        </FormSection>

        <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-border bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
