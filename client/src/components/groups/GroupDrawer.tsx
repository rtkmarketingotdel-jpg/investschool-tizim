import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { cn } from '@/lib/cn';
import { todayLocal } from '@/lib/dates';
import { schoolApi, type Group, type GroupInput } from '@/lib/schoolApi';
import { Button, Drawer, Input, Select, useToast } from '../ui';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'errors.required');
const schema = z
  .object({
    name: z.string().trim().min(1, 'errors.required').max(30, 'errors.tooLong'),
    courseId: z.string().min(1, 'errors.required'),
    capacity: z.number({ invalid_type_error: 'errors.required' }).int().min(1).max(100),
    teacherId: z.string(),
    branchId: z.string(),
    startDate: z.string().min(1, 'errors.required'),
    endDate: z.string().min(1, 'errors.required'),
    days: z.array(z.number()).min(1, 'groups.daysRequired'),
    timeStart: time,
    timeEnd: time,
    room: z.string().max(40, 'errors.tooLong'),
  })
  .refine((v) => v.endDate > v.startDate, { message: 'groups.endAfterStart', path: ['endDate'] })
  .refine((v) => v.timeEnd > v.timeStart, { message: 'groups.endAfterStart', path: ['timeEnd'] });
type FormValues = z.infer<typeof schema>;

const empty = (): FormValues => ({
  name: '', courseId: '', capacity: 15, teacherId: '', branchId: '', startDate: todayLocal(), endDate: '',
  days: [1, 3, 5], timeStart: '09:00', timeEnd: '12:00', room: '',
});
const fromGroup = (g: Group): FormValues => ({
  name: g.name, courseId: g.courseId, capacity: g.capacity, teacherId: g.teacherId ?? '', branchId: g.branchId ?? '',
  startDate: g.startDate, endDate: g.endDate, days: g.days, timeStart: g.timeStart, timeEnd: g.timeEnd, room: g.room ?? '',
});

/** Day before the same date `months` later: a 3-month course from 5 Sep ends on 4 Dec. */
function endFor(start: string, months: number) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  group: Group | null;
  onClose: () => void;
}

export function GroupDrawer({ open, group, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ['staff', 'teachers'], queryFn: () => schoolApi.staff({ active: 'true', teacher: 'true', page: 1, limit: 100 }), enabled: open });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches, enabled: open });
  const courses = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses, enabled: open });
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: empty(),
  });
  useEffect(() => {
    if (open) reset(group ? fromGroup(group) : empty());
  }, [open, group, reset]);

  const invalidate = () => {
    for (const k of ['groups', 'courses', 'dashboard']) void qc.invalidateQueries({ queryKey: [k] });
  };
  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body: GroupInput = { ...v, teacherId: v.teacherId || null, branchId: v.branchId || null, room: v.room.trim() || null };
      return group ? schoolApi.updateGroup(group.id, body) : schoolApi.createGroup(body);
    },
    onSuccess: () => {
      toast(t(group ? 'groups.updated' : 'groups.created'));
      invalidate();
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  const remove = useMutation({
    mutationFn: () => schoolApi.deleteGroup(group!.id),
    onSuccess: () => {
      toast(t('groups.deleted'));
      invalidate();
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const err = (k: keyof FormValues) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);
  const courseId = watch('courseId');
  const startDate = watch('startDate');
  const months = courses.data?.find((c) => c.id === courseId)?.durationMonths;
  const autoEnd = () => months && startDate && setValue('endDate', endFor(startDate, months), { shouldValidate: true });

  return (
    <Drawer open={open} onClose={onClose} title={t(group ? 'groups.edit' : 'groups.add')}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('groups.name')} placeholder="TK-04" error={err('name')} {...register('name')} />
          <Input type="number" min={1} label={t('groups.capacity')} error={err('capacity')} {...register('capacity', { valueAsNumber: true })} />
        </div>
        <Select
          label={t('groups.course')}
          error={err('courseId')}
          {...register('courseId', {
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
              const m = courses.data?.find((c) => c.id === e.target.value)?.durationMonths;
              if (m && startDate) setValue('endDate', endFor(startDate, m));
            },
          })}
        >
          <option value="">—</option>
          {courses.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {t('courses.months', { count: c.durationMonths })}</option>
          ))}
        </Select>
        {group && group.studentCount > 0 && <p className="-mt-2 text-xs text-text-muted">{t('groups.courseLockedHint')}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Input type="date" label={t('groups.startDate')} error={err('startDate')} {...register('startDate', { onChange: () => !group && autoEnd() })} />
          <Input type="date" label={t('groups.endDate')} error={err('endDate')} {...register('endDate')} />
        </div>
        {months && startDate && (
          <button type="button" onClick={autoEnd} className="-mt-2 text-sm text-primary hover:underline">
            {t('groups.endByCourse', { count: months })}
          </button>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium">{t('groups.days')}</span>
          <Controller
            control={control}
            name="days"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const on = field.value.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? field.value.filter((x) => x !== d) : [...field.value, d].sort())}
                      className={cn(
                        'min-w-12 rounded-xl border px-3 py-2 text-sm font-medium transition',
                        on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted',
                      )}
                    >
                      {t(`groups.daysShort.${d}`)}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {err('days') && <p className="mt-1 text-sm text-danger">{err('days')}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input type="time" label={t('groups.timeStart')} error={err('timeStart')} {...register('timeStart')} />
          <Input type="time" label={t('groups.timeEnd')} error={err('timeEnd')} {...register('timeEnd')} />
          <Input label={t('groups.room')} placeholder="101-xona" error={err('room')} {...register('room')} />
        </div>

        <Select label={t('groups.teacher')} {...register('teacherId')}>
          <option value="">—</option>
          {staff.data?.items.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}{u.specialty ? ` · ${u.specialty}` : ''}</option>
          ))}
        </Select>
        <Select label={t('staff.branch')} {...register('branchId')}>
          <option value="">{t('staff.anyBranch')}</option>
          {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>

        <div className="flex gap-3 pt-4">
          {group && (
            <Button
              type="button"
              variant="ghost"
              aria-label={t('common.delete')}
              title={t('common.delete')}
              loading={remove.isPending}
              onClick={() => window.confirm(t('groups.deleteConfirm', { name: group.name })) && remove.mutate()}
              className="px-3 text-danger"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button type="submit" loading={save.isPending} className="flex-1">{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
