import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorCode } from '@/lib/api';
import { schoolApi, type SchoolClass } from '@/lib/schoolApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';

const schema = z.object({
  name: z.string().trim().min(1, 'errors.required'),
  grade: z.number({ invalid_type_error: 'errors.required' }).int().min(1).max(11),
  capacity: z.number({ invalid_type_error: 'errors.required' }).int().min(1).max(100),
  teacherId: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  cls: SchoolClass | null;
  onClose: () => void;
}

export function ClassDrawer({ open, cls, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ['staff', 'all'], queryFn: () => schoolApi.staff({ active: 'true', page: 1, limit: 100 }), enabled: open });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', grade: 1, capacity: 15, teacherId: '' },
  });
  useEffect(() => {
    if (open) reset(cls ? { name: cls.name, grade: cls.grade, capacity: cls.capacity, teacherId: cls.teacherId ?? '' } : { name: '', grade: 1, capacity: 15, teacherId: '' });
  }, [open, cls, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = { ...v, teacherId: v.teacherId || null };
      return cls ? schoolApi.updateClass(cls.id, body) : schoolApi.createClass(body);
    },
    onSuccess: () => {
      toast(t(cls ? 'classes.updated' : 'classes.created'));
      void qc.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);

  return (
    <Drawer open={open} onClose={onClose} title={t(cls ? 'classes.edit' : 'classes.add')}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <Input label={t('classes.name')} placeholder="3-A" error={err('name')} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" min={1} max={11} label={t('classes.grade')} error={err('grade')} {...register('grade', { valueAsNumber: true })} />
          <Input type="number" min={1} label={t('classes.capacity')} error={err('capacity')} {...register('capacity', { valueAsNumber: true })} />
        </div>
        <Select label={t('classes.teacher')} {...register('teacherId')}>
          <option value="">—</option>
          {staff.data?.items.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </Select>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
