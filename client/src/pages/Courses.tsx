import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useAuth, isManagement } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { schoolApi, type Course } from '@/lib/schoolApi';
import { PageHeader } from '@/components/PageHeader';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseDrawer } from '@/components/courses/CourseDrawer';
import { Textarea } from '@/components/FormBits';
import { Button, Card, EmptyState, Input, Modal, Skeleton, useToast } from '@/components/ui';

interface Form {
  name: string;
  months: string;
  price: string;
  description: string;
}
const blank: Form = { name: '', months: '3', price: '', description: '' };
const formOf = (c: Course): Form => ({ name: c.name, months: String(c.durationMonths), price: String(c.price), description: c.description ?? '' });

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-xl p-4 sm:p-6">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-xl tabular-nums sm:text-2xl">{value}</p>
    </Card>
  );
}

export default function Courses() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = isManagement(user?.role);
  const list = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Course | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; form: Form } | null>(null);

  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const done = () => {
    for (const k of ['courses', 'groups', 'staff']) void qc.invalidateQueries({ queryKey: [k] });
  };
  const form = edit?.form;
  const months = Number(form?.months);
  const price = Number(form?.price);
  const valid = !!form && form.name.trim().length >= 2 && Number.isInteger(months) && months >= 1 && months <= 36 && form.price !== '' && Number.isInteger(price) && price >= 0;
  const save = useMutation({
    mutationFn: () => schoolApi.saveCourse(edit!.id, { name: form!.name.trim(), description: form!.description.trim() || null, durationMonths: months, price }),
    onSuccess: () => { toast(t('courses.saved')); setEdit(null); done(); },
    onError: fail,
  });
  const del = useMutation({ mutationFn: (c: Course) => schoolApi.deleteCourse(c.id), onSuccess: () => { toast(t('courses.deleted')); done(); }, onError: fail });

  const all = list.data ?? [];
  const term = q.trim().toLowerCase();
  const rows = all.filter((c) => !term || c.name.toLowerCase().includes(term));
  const current = open ? (all.find((c) => c.id === open.id) ?? open) : null;
  const setForm = (patch: Partial<Form>) => setEdit((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('nav.courses')}
        subtitle={t('courses.subtitle')}
        action={canEdit && <Button onClick={() => setEdit({ id: null, form: blank })}><Plus className="h-5 w-5" /> {t('courses.add')}</Button>}
      />
      {all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat label={t('courses.stats.courses')} value={all.length} />
          <Stat label={t('courses.stats.running')} value={all.reduce((n, c) => n + c.groups.filter((g) => g.status === 'ACTIVE').length, 0)} />
          <Stat label={t('courses.stats.studying')} value={all.reduce((n, c) => n + c.activeStudents, 0)} />
          <Stat label={t('courses.stats.graduates')} value={all.reduce((n, c) => n + c.graduates, 0)} />
        </div>
      )}
      <div className="w-full sm:w-72"><Input aria-label={t('common.search')} placeholder={t('courses.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} /></div>

      {list.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
      ) : list.isError ? (
        <EmptyState icon={BookOpen} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BookOpen} title={q ? t('courses.noMatch') : t('courses.empty')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              canEdit={canEdit}
              onOpen={() => setOpen(c)}
              onEdit={() => setEdit({ id: c.id, form: formOf(c) })}
              onDelete={() => window.confirm(t('courses.deleteConfirm', { name: c.name })) && del.mutate(c)}
            />
          ))}
        </div>
      )}

      <CourseDrawer course={current} onClose={() => setOpen(null)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t(edit?.id ? 'courses.edit' : 'courses.add')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }}>
          <Input label={t('courses.name')} placeholder={t('courses.namePlaceholder')} value={form?.name ?? ''} onChange={(e) => setForm({ name: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min={1} max={36} label={t('courses.duration')} value={form?.months ?? ''} onChange={(e) => setForm({ months: e.target.value })} />
            <Input type="number" min={0} step={100000} label={`${t('courses.price')} (${t('common.currency')})`} value={form?.price ?? ''} onChange={(e) => setForm({ price: e.target.value })} />
          </div>
          {edit?.id && <p className="-mt-2 text-xs text-text-muted">{t('courses.priceHint')}</p>}
          <Textarea label={t('courses.description')} value={form?.description ?? ''} onChange={(e) => setForm({ description: e.target.value })} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={save.isPending} disabled={!valid}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
