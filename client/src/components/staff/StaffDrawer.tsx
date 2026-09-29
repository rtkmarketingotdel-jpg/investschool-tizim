import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { schoolApi, type Role, type StaffMember } from '@/lib/schoolApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { PhoneInput } from '../PhoneInput';

const schema = z.object({
  fullName: z.string().trim().min(3, 'errors.required'),
  phone: z.string().regex(/^\+998\d{9}$/, 'errors.phone'),
  role: z.enum(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF']),
  position: z.string().trim().min(1, 'errors.required'),
  baseSalary: z.number({ invalid_type_error: 'errors.required' }).int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { fullName: '', phone: '', role: 'STAFF', position: '', baseSalary: 4_000_000, isActive: true };

interface Props {
  open: boolean;
  member: StaffMember | null;
  onClose: () => void;
  onCreated: (name: string, tempPassword: string) => void;
}

export function StaffDrawer({ open, member, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const roles: Role[] = user?.role === 'DIRECTOR' ? ['STAFF', 'ADMIN', 'ACCOUNTANT', 'DIRECTOR'] : ['STAFF', 'ADMIN'];

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  useEffect(() => {
    if (open) reset(member ? { fullName: member.fullName, phone: member.phone, role: member.role, position: member.position, baseSalary: member.baseSalary, isActive: member.isActive } : empty);
  }, [open, member, reset]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      if (member) {
        await schoolApi.updateStaff(member.id, v);
        return null;
      }
      return schoolApi.createStaff(v);
    },
    onSuccess: (res, v) => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      if (res) onCreated(v.fullName, res.tempPassword);
      else toast(t('staff.updated'));
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);
  // ADMIN cannot edit a privileged account at all (server enforces it too).
  const locked = !!member && user?.role !== 'DIRECTOR' && (member.role === 'DIRECTOR' || member.role === 'ACCOUNTANT');

  return (
    <Drawer open={open} onClose={onClose} title={t(member ? 'staff.edit' : 'staff.add')}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <Input label={t('staff.fullName')} error={err('fullName')} {...register('fullName')} />
        <Controller control={control} name="phone" render={({ field }) => <PhoneInput label={t('staff.phone')} value={field.value} onChange={field.onChange} error={err('phone')} />} />
        <Select label={t('staff.role')} {...register('role')}>
          {roles.map((r) => (
            <option key={r} value={r}>{t(`roles.${r}`)}</option>
          ))}
        </Select>
        <Input label={t('staff.position')} error={err('position')} {...register('position')} />
        <Input type="number" min={0} step={100000} label={t('staff.baseSalary')} error={err('baseSalary')} {...register('baseSalary', { valueAsNumber: true })} />
        {member && (
          <Controller control={control} name="isActive" render={({ field }) => <Checkbox label={t('staff.active')} checked={field.value} onChange={field.onChange} />} />
        )}
        {!member && <p className="text-sm text-text-muted">{t('staff.passwordHint')}</p>}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} disabled={locked} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
