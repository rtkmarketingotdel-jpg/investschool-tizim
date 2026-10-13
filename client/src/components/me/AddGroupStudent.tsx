import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DISTRICTS } from '@/lib/constants';
import { errorCode } from '@/lib/api';
import { addGroupStudent } from '@/lib/meApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { FormSection } from '../FormBits';
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
  district: z.string(),
  address: z.string().max(500, 'errors.tooLong'),
});
type FormValues = z.infer<typeof schema>;
const empty: FormValues = { lastName: '', firstName: '', middleName: '', birthDate: '', gender: 'MALE', phone: '', phone2: '', district: '', address: '' };

interface Props {
  open: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
}

/** A teacher enrols a trainee into their own group (no money fields: the course price applies, management sets discounts). */
export function AddGroupStudent({ open, groupId, groupName, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  useEffect(() => { if (open) reset(empty); }, [open, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => addGroupStudent(groupId, {
      ...v, middleName: v.middleName || null, birthDate: v.birthDate || null, phone2: v.phone2 || null,
      district: v.district || null, address: v.address || null,
    }),
    onSuccess: () => {
      toast(t('students.created'));
      void qc.invalidateQueries({ queryKey: ['me', 'teaching'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);

  return (
    <Drawer open={open} onClose={onClose} title={t('me.group.addStudent', { name: groupName })}>
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
        <FormSection title={t('students.sections.contacts')}>
          <Controller control={control} name="phone" render={({ field }) => <PhoneInput label={t('students.phone')} value={field.value} onChange={field.onChange} error={err('phone')} />} />
          <Controller control={control} name="phone2" render={({ field }) => <PhoneInput label={t('students.phone2')} value={field.value} onChange={field.onChange} error={err('phone2')} />} />
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
