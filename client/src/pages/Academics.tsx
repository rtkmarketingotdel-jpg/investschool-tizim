import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap, Phone, Plus, Search, Trophy } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { schoolApi, type Club, type Subject } from '@/lib/schoolApi';
import { PageHeader } from '@/components/PageHeader';
import { ClubCard } from '@/components/academics/ClubCard';
import { ClubDrawer, SubjectDrawer } from '@/components/academics/DetailDrawers';
import { cardShell } from '@/components/academics/parts';
import { SubjectCard } from '@/components/academics/SubjectCard';
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, Tabs, useToast } from '@/components/ui';

type Tab = 'subjects' | 'clubs' | 'tutors';

function useFail() {
  const { t } = useTranslation();
  const toast = useToast();
  return (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
}

const CardGrid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
const GridSkeleton = () => <CardGrid>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</CardGrid>;

function SubjectsTab({ q, adding, onAddDone }: { q: string; adding: boolean; onAddDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const fail = useFail();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['subjects'], queryFn: schoolApi.subjects });
  const [edit, setEdit] = useState<{ id: string | null; name: string } | null>(null);
  const [open, setOpen] = useState<Subject | null>(null);
  const modal = adding && !edit ? { id: null, name: '' } : edit;
  const close = () => { setEdit(null); onAddDone(); };
  const done = () => { void qc.invalidateQueries({ queryKey: ['subjects'] }); void qc.invalidateQueries({ queryKey: ['staff'] }); };
  const save = useMutation({ mutationFn: () => schoolApi.saveSubject(modal!.id, modal!.name.trim()), onSuccess: () => { toast(t('academics.saved')); close(); done(); }, onError: fail });
  const del = useMutation({ mutationFn: (s: Subject) => schoolApi.deleteSubject(s.id), onSuccess: () => { toast(t('academics.deleted')); done(); }, onError: fail });
  const rows = (list.data ?? []).filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const current = open ? (list.data ?? []).find((s) => s.id === open.id) ?? open : null;

  return (
    <>
      {list.isLoading ? <GridSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={BookOpen} title={q ? t('academics.noMatch') : t('academics.noSubjects')} />
      ) : (
        <CardGrid>
          {rows.map((s) => (
            <SubjectCard key={s.id} subject={s} onOpen={() => setOpen(s)} onEdit={() => setEdit({ id: s.id, name: s.name })}
              onDelete={() => window.confirm(t('academics.deleteConfirm', { name: s.name })) && del.mutate(s)} />
          ))}
        </CardGrid>
      )}
      <SubjectDrawer subject={current} onClose={() => setOpen(null)} />
      <Modal open={!!modal} onClose={close} title={t(modal?.id ? 'academics.editSubject' : 'academics.addSubject')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (modal && modal.name.trim().length >= 2) save.mutate(); }}>
          <Input label={t('academics.name')} value={modal?.name ?? ''} onChange={(e) => setEdit({ id: modal?.id ?? null, name: e.target.value })} autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={close}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={save.isPending} disabled={(modal?.name.trim().length ?? 0) < 2}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ClubsTab({ q, adding, onAddDone }: { q: string; adding: boolean; onAddDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const fail = useFail();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['clubs'], queryFn: schoolApi.clubs });
  const teachers = useQuery({ queryKey: ['staff', 'teachers-all'], queryFn: () => schoolApi.staff({ active: 'true', page: 1, limit: 100 }) });
  const [edit, setEdit] = useState<{ id: string | null; name: string; teacherId: string; fee: string } | null>(null);
  const [open, setOpen] = useState<Club | null>(null);
  const blank = { id: null, name: '', teacherId: '', fee: '' };
  const modal = adding && !edit ? blank : edit;
  const close = () => { setEdit(null); onAddDone(); };
  const done = () => { void qc.invalidateQueries({ queryKey: ['clubs'] }); void qc.invalidateQueries({ queryKey: ['students'] }); };
  const save = useMutation({
    mutationFn: () => schoolApi.saveClub(modal!.id, { name: modal!.name.trim(), teacherId: modal!.teacherId || null, monthlyFee: Number(modal!.fee) || 0 }),
    onSuccess: () => { toast(t('academics.saved')); close(); done(); }, onError: fail,
  });
  const del = useMutation({ mutationFn: (c: Club) => schoolApi.deleteClub(c.id), onSuccess: () => { toast(t('academics.deleted')); done(); }, onError: fail });
  const rows = (list.data ?? []).filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = t('common.currency');

  return (
    <>
      {list.isLoading ? <GridSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={Trophy} title={q ? t('academics.noMatch') : t('academics.noClubs')} />
      ) : (
        <CardGrid>
          {rows.map((c) => (
            <ClubCard key={c.id} club={c} onOpen={() => setOpen(c)} onEdit={() => setEdit({ id: c.id, name: c.name, teacherId: c.teacherId ?? '', fee: String(c.monthlyFee) })}
              onDelete={() => window.confirm(t('academics.deleteClubConfirm', { name: c.name, count: c.members })) && del.mutate(c)} />
          ))}
        </CardGrid>
      )}
      <ClubDrawer club={open ? (list.data ?? []).find((c) => c.id === open.id) ?? open : null} onClose={() => setOpen(null)} />
      <Modal open={!!modal} onClose={close} title={t(modal?.id ? 'academics.editClub' : 'academics.addClub')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (modal && modal.name.trim().length >= 2) save.mutate(); }}>
          <Input label={t('academics.name')} value={modal?.name ?? ''} onChange={(e) => setEdit({ ...(modal ?? blank), name: e.target.value })} autoFocus />
          <Select label={t('academics.leader')} value={modal?.teacherId ?? ''} onChange={(e) => setEdit({ ...(modal ?? blank), teacherId: e.target.value })}>
            <option value="">—</option>
            {teachers.data?.items.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
          <Input type="number" min={0} step={10000} label={`${t('academics.fee')} (${cur})`} value={modal?.fee ?? ''} onChange={(e) => setEdit({ ...(modal ?? blank), fee: e.target.value })} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={close}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={save.isPending} disabled={(modal?.name.trim().length ?? 0) < 2}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function TutorsTab({ q }: { q: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['staff', 'tutors'], queryFn: () => schoolApi.staff({ tutor: 'true', page: 1, limit: 100 }) });
  const rows = (list.data?.items ?? []).filter((u) => !q.trim() || `${u.fullName} ${u.position}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-text-muted">{t('academics.tutorsHint')}</p>
      {list.isLoading ? <GridSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title={q ? t('academics.noMatch') : t('academics.noTutors')} />
      ) : (
        <CardGrid>
          {rows.map((u) => (
            <article key={u.id} className={cardShell}>
              <button type="button" onClick={() => navigate(`/staff/${u.id}`)} className="block w-full p-6 text-left focus-visible:rounded-3xl" aria-label={u.fullName}>
                <div className="flex items-center gap-4">
                  <Avatar name={u.fullName} size={60} src={u.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg">{u.fullName}</p>
                    <p className="truncate text-sm text-text-muted">{u.position}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="flex items-center gap-2 text-sm text-text-muted"><Phone className="h-4 w-4" /> {u.phone}</span>
                  <Badge tone={u.isActive ? 'success' : 'danger'}>{t(u.isActive ? 'staff.active' : 'staff.inactive')}</Badge>
                </div>
              </button>
            </article>
          ))}
        </CardGrid>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-3xl p-4 sm:p-6">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-xl tabular-nums tracking-tight sm:text-2xl">{value}</p>
    </Card>
  );
}

export default function Academics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('subjects');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: schoolApi.subjects });
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: schoolApi.clubs });
  const teachers = useQuery({ queryKey: ['staff', 'count', 'teacher'], queryFn: () => schoolApi.staff({ teacher: 'true', page: 1, limit: 1 }) });
  const tutors = useQuery({ queryKey: ['staff', 'tutors'], queryFn: () => schoolApi.staff({ tutor: 'true', page: 1, limit: 100 }) });
  const counts = useMemo(() => ({ subjects: subjects.data?.length ?? 0, clubs: clubs.data?.length ?? 0, tutors: tutors.data?.total ?? 0 }), [subjects.data, clubs.data, tutors.data]);
  const members = (clubs.data ?? []).reduce((n, c) => n + c.members, 0);

  const action =
    tab === 'tutors' ? (
      <Button onClick={() => navigate('/staff?add=tutor')} className="shadow-lg shadow-primary/25"><Plus className="h-5 w-5" /> {t('staff.addTutor')}</Button>
    ) : (
      <Button onClick={() => setAdding(true)} className="shadow-lg shadow-primary/25"><Plus className="h-5 w-5" /> {t(tab === 'subjects' ? 'academics.addSubject' : 'academics.addClub')}</Button>
    );

  return (
    <div className="space-y-8">
      <PageHeader title={t('nav.academics')} subtitle={t('academics.subtitle')} action={action} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label={t('academics.tabs.subjects')} value={counts.subjects} />
        <Stat label={t('academics.stats.teachers')} value={teachers.data?.total ?? '…'} />
        <Stat label={t('academics.tabs.clubs')} value={counts.clubs} />
        <Stat label={t('academics.stats.members')} value={members} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Tabs value={tab} onChange={(v) => { setTab(v); setQ(''); }} tabs={(['subjects', 'clubs', 'tutors'] as Tab[]).map((id) => ({ id, label: `${t(`academics.tabs.${id}`)} · ${counts[id]}` }))} />
        </div>
        <div className="w-full sm:w-72"><Input aria-label={t('common.search')} placeholder={t('academics.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} /></div>
      </div>
      {tab === 'subjects' && <SubjectsTab q={q} adding={adding} onAddDone={() => setAdding(false)} />}
      {tab === 'clubs' && <ClubsTab q={q} adding={adding} onAddDone={() => setAdding(false)} />}
      {tab === 'tutors' && <TutorsTab q={q} />}
    </div>
  );
}
