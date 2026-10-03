import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DISTRICTS } from '@/lib/constants';
import { errorCode } from '@/lib/api';
import { addClassStudent } from '@/lib/meApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { Checkbox, FormSection } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const phone = z.string().regex(/^\+998\d{9}$/, 'errors.phone');
const schema = z.object({
  lastName: z.string().trim().min(1, 'errors.required'),
  firstName: z.string().trim().min(1, 'errors.required'),
  middleName: z.string(),
  birthDate: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  parentName: z.string().trim().min(1, 'errors.required'),
  parentPhone: phone,
  parentPhone2: z.string().refine((v) => v === '' || /^\+998\d{9}$/.test(v), 'errors.phone'),
  district: z.string(),
  address: z.string(),
  isBoarding: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
const empty: FormValues = { lastName: '', firstName: '', middleName: '', birthDate: '', gender: 'MALE', parentName: '', parentPhone: '', parentPhone2: '', district: '', address: '', isBoarding: false };

interface Props {
  open: boolean;
  classId: string;
  className: string;
  onClose: () => void;
}

/** Homeroom teacher adds a student to their own class (no money fields: management sets the fee later). */
export function AddClassStudent({ open, classId, className, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  useEffect(() => { if (open) reset(empty); }, [open, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => addClassStudent(classId, {
      ...v, middleName: v.middleName || null, birthDate: v.birthDate || null, parentPhone2: v.parentPhone2 || null,
      district: v.district || null, address: v.address || null,
    }),
    onSuccess: () => {
      toast(t('students.created'));
      void qc.invalidateQueries({ queryKey: ['me', 'teaching'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);

  return (
    <Drawer open={open} onClose={onClose} title={t('me.class.addStudent', { name: className })}>
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
          <Controller control={control} name="isBoarding" render={({ field }) => <Checkbox label={t('students.boarding')} checked={field.value} onChange={field.onChange} />} />
        </FormSection>
        <FormSection title={t('students.sections.parent')}>
          <Input label={t('students.parentName')} error={err('parentName')} {...register('parentName')} />
          <Controller control={control} name="parentPhone" render={({ field }) => <PhoneInput label={t('students.parentPhone')} value={field.value} onChange={field.onChange} error={err('parentPhone')} />} />
          <Controller control={control} name="parentPhone2" render={({ field }) => <PhoneInput label={t('students.parentPhone2')} value={field.value} onChange={field.onChange} error={err('parentPhone2')} />} />
          <Select label={t('students.district')} {...register('district')}>
            <option value="">—</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Input label={t('students.address')} {...register('address')} />
        </FormSection>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
