import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { CLUBS, DISTRICTS } from '@/lib/constants';
import { errorCode } from '@/lib/api';
import { schoolApi, type Student, type StudentInput } from '@/lib/schoolApi';
import { todayLocal } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { Checkbox, FormSection, Textarea } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const phone = z.string().regex(/^\+998\d{9}$/, 'errors.phone');
const schema = z.object({
  lastName: z.string().trim().min(1, 'errors.required'),
  firstName: z.string().trim().min(1, 'errors.required'),
  middleName: z.string(),
  birthDate: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  classId: z.string(),
  parentName: z.string().trim().min(1, 'errors.required'),
  parentPhone: phone,
  parentPhone2: z.string().refine((v) => v === '' || /^\+998\d{9}$/.test(v), 'errors.phone'),
  district: z.string(),
  address: z.string(),
  isBoarding: z.boolean(),
  clubs: z.array(z.string()),
  monthlyFee: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  discountPercent: z.number({ invalid_type_error: 'errors.required' }).int().min(0).max(100),
  status: z.enum(['ACTIVE', 'TRIAL', 'LEFT']),
  enrolledAt: z.string().min(1, 'errors.required'),
  notes: z.string(),
});
type FormValues = z.infer<typeof schema>;

const empty = (): FormValues => ({
  lastName: '', firstName: '', middleName: '', birthDate: '', gender: 'MALE', classId: '',
  parentName: '', parentPhone: '', parentPhone2: '', district: '', address: '', isBoarding: false,
  clubs: [], monthlyFee: 3_000_000, discountPercent: 0, status: 'ACTIVE', enrolledAt: todayLocal(), notes: '',
});

const fromStudent = (s: Student): FormValues => ({
  lastName: s.lastName, firstName: s.firstName, middleName: s.middleName ?? '', birthDate: s.birthDate ?? '',
  gender: s.gender, classId: s.classId ?? '', parentName: s.parentName, parentPhone: s.parentPhone,
  parentPhone2: s.parentPhone2 ?? '', district: s.district ?? '', address: s.address ?? '', isBoarding: s.isBoarding,
  clubs: s.clubs, monthlyFee: s.monthlyFee, discountPercent: s.discountPercent, status: s.status,
  enrolledAt: s.enrolledAt, notes: s.notes ?? '',
});

const toInput = (v: FormValues): StudentInput => ({
  ...v,
  middleName: v.middleName || null,
  birthDate: v.birthDate || null,
  classId: v.classId || null,
  parentPhone2: v.parentPhone2 || null,
  district: v.district || null,
  address: v.address || null,
  notes: v.notes || null,
});

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
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes, enabled: open });

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
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
      void qc.invalidateQueries({ queryKey: ['classes'] });
      onSaved?.(s);
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const classId = watch('classId');
  const status = watch('status');
  const chosen = classes.data?.find((c) => c.id === classId);
  const isCurrent = !!student && student.classId === classId && student.status !== 'LEFT';
  const classFull = !!chosen && chosen.freeSeats === 0 && !isCurrent && status !== 'LEFT';
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);

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
        </FormSection>

        <FormSection title={t('students.sections.study')}>
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('students.class')} {...register('classId')}>
              <option value="">{t('students.noClass')}</option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {t('classes.free', { count: c.freeSeats })}
                </option>
              ))}
            </Select>
            <Select label={t('students.status')} {...register('status')}>
              <option value="ACTIVE">{t('students.statuses.ACTIVE')}</option>
              <option value="TRIAL">{t('students.statuses.TRIAL')}</option>
              <option value="LEFT">{t('students.statuses.LEFT')}</option>
            </Select>
          </div>
          {classFull && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm text-[#B45309] dark:bg-amber-500/15 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {t('students.classFullWarning')}
            </p>
          )}
          <Input type="date" label={t('students.enrolledAt')} error={err('enrolledAt')} {...register('enrolledAt')} />
          <Controller
            control={control}
            name="isBoarding"
            render={({ field }) => <Checkbox label={t('students.boarding')} checked={field.value} onChange={field.onChange} />}
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium">{t('students.clubs')}</span>
            <Controller
              control={control}
              name="clubs"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {CLUBS.map((c) => {
                    const on = field.value.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== c) : [...field.value, c])}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-medium transition',
                          on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted',
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>
        </FormSection>

        <FormSection title={t('students.sections.parent')}>
          <Input label={t('students.parentName')} error={err('parentName')} {...register('parentName')} />
          <Controller
            control={control}
            name="parentPhone"
            render={({ field }) => <PhoneInput label={t('students.parentPhone')} value={field.value} onChange={field.onChange} error={err('parentPhone')} />}
          />
          <Controller
            control={control}
            name="parentPhone2"
            render={({ field }) => <PhoneInput label={t('students.parentPhone2')} value={field.value} onChange={field.onChange} error={err('parentPhone2')} />}
          />
          <Select label={t('students.district')} {...register('district')}>
            <option value="">—</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Input label={t('students.address')} {...register('address')} />
        </FormSection>

        <FormSection title={t('students.sections.payment')}>
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min={0} step={100000} label={t('students.monthlyFee')} error={err('monthlyFee')} {...register('monthlyFee', { valueAsNumber: true })} />
            <Input type="number" min={0} max={100} label={t('students.discount')} error={err('discountPercent')} {...register('discountPercent', { valueAsNumber: true })} />
          </div>
          <Textarea label={t('students.notes')} {...register('notes')} />
        </FormSection>

        <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-border bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
