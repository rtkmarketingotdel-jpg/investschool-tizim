import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { schoolApi, type Club, type Subject } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, Table, Td, Th, Thead, Tr, Tabs, useToast } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

type Tab = 'subjects' | 'clubs' | 'tutors';

function useFail() {
  const { t } = useTranslation();
  const toast = useToast();
  return (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
}

function SubjectsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const fail = useFail();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['subjects'], queryFn: schoolApi.subjects });
  const [edit, setEdit] = useState<{ id: string | null; name: string } | null>(null);
  const done = () => { void qc.invalidateQueries({ queryKey: ['subjects'] }); void qc.invalidateQueries({ queryKey: ['staff'] }); };
  const save = useMutation({ mutationFn: () => schoolApi.saveSubject(edit!.id, edit!.name.trim()), onSuccess: () => { toast(t('academics.saved')); setEdit(null); done(); }, onError: fail });
  const del = useMutation({ mutationFn: (s: Subject) => schoolApi.deleteSubject(s.id), onSuccess: () => { toast(t('academics.deleted')); done(); }, onError: fail });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEdit({ id: null, name: '' })}><Plus className="h-5 w-5" /> {t('academics.addSubject')}</Button></div>
      {list.isLoading ? <Skeleton className="h-64" /> : !list.data?.length ? <EmptyState icon={BookOpen} title={t('common.empty')} /> : (
        <Table>
          <Thead><tr><Th>{t('staff.subject')}</Th><Th>{t('academics.teachers')}</Th><Th className="w-28"><span className="sr-only">{t('common.actions')}</span></Th></tr></Thead>
          <tbody>
            {list.data.map((s) => (
              <Tr key={s.id}>
                <Td>{s.name}</Td>
                <Td className="text-text-muted">{s.teachers}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button aria-label={t('common.edit')} onClick={() => setEdit({ id: s.id, name: s.name })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={t('common.delete')} onClick={() => window.confirm(t('academics.deleteConfirm', { name: s.name })) && del.mutate(s)} className="rounded-lg p-2 text-red-600 hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t(edit?.id ? 'academics.editSubject' : 'academics.addSubject')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (edit && edit.name.trim().length >= 2) save.mutate(); }}>
          <Input label={t('academics.name')} value={edit?.name ?? ''} onChange={(e) => setEdit((x) => x && { ...x, name: e.target.value })} autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={save.isPending} disabled={(edit?.name.trim().length ?? 0) < 2}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ClubsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const fail = useFail();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['clubs'], queryFn: schoolApi.clubs });
  const teachers = useQuery({ queryKey: ['staff', 'teachers-all'], queryFn: () => schoolApi.staff({ active: 'true', page: 1, limit: 100 }) });
  const [edit, setEdit] = useState<{ id: string | null; name: string; teacherId: string; fee: string } | null>(null);
  const done = () => { void qc.invalidateQueries({ queryKey: ['clubs'] }); void qc.invalidateQueries({ queryKey: ['students'] }); };
  const save = useMutation({
    mutationFn: () => schoolApi.saveClub(edit!.id, { name: edit!.name.trim(), teacherId: edit!.teacherId || null, monthlyFee: Number(edit!.fee) || 0 }),
    onSuccess: () => { toast(t('academics.saved')); setEdit(null); done(); }, onError: fail,
  });
  const del = useMutation({ mutationFn: (c: Club) => schoolApi.deleteClub(c.id), onSuccess: () => { toast(t('academics.deleted')); done(); }, onError: fail });
  const cur = t('common.currency');

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEdit({ id: null, name: '', teacherId: '', fee: '' })}><Plus className="h-5 w-5" /> {t('academics.addClub')}</Button></div>
      {list.isLoading ? <Skeleton className="h-64" /> : !list.data?.length ? <EmptyState icon={Trophy} title={t('common.empty')} /> : (
        <Table>
          <Thead><tr><Th>{t('academics.club')}</Th><Th>{t('academics.leader')}</Th><Th numeric>{t('academics.fee')}</Th><Th numeric>{t('academics.members')}</Th><Th className="w-28"><span className="sr-only">{t('common.actions')}</span></Th></tr></Thead>
          <tbody>
            {list.data.map((c) => (
              <Tr key={c.id}>
                <Td>{c.name}</Td>
                <Td className="text-text-muted">{c.teacherName ?? '—'}</Td>
                <Td numeric>{c.monthlyFee ? formatMoney(c.monthlyFee, cur) : '—'}</Td>
                <Td numeric>{c.members}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button aria-label={t('common.edit')} onClick={() => setEdit({ id: c.id, name: c.name, teacherId: c.teacherId ?? '', fee: String(c.monthlyFee) })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={t('common.delete')} onClick={() => window.confirm(t('academics.deleteClubConfirm', { name: c.name, count: c.members })) && del.mutate(c)} className="rounded-lg p-2 text-red-600 hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t(edit?.id ? 'academics.editClub' : 'academics.addClub')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (edit && edit.name.trim().length >= 2) save.mutate(); }}>
          <Input label={t('academics.name')} value={edit?.name ?? ''} onChange={(e) => setEdit((x) => x && { ...x, name: e.target.value })} autoFocus />
          <Select label={t('academics.leader')} value={edit?.teacherId ?? ''} onChange={(e) => setEdit((x) => x && { ...x, teacherId: e.target.value })}>
            <option value="">—</option>
            {teachers.data?.items.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
          <Input type="number" min={0} step={10000} label={`${t('academics.fee')} (${cur})`} value={edit?.fee ?? ''} onChange={(e) => setEdit((x) => x && { ...x, fee: e.target.value })} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={save.isPending} disabled={(edit?.name.trim().length ?? 0) < 2}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TutorsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['staff', 'tutors'], queryFn: () => schoolApi.staff({ tutor: 'true', page: 1, limit: 100 }) });
  return (
    <div className="space-y-4">
      <p className="text-text-muted">{t('academics.tutorsHint')}</p>
      {list.isLoading ? <Skeleton className="h-48" /> : !list.data?.items.length ? <EmptyState icon={GraduationCap} title={t('academics.noTutors')} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.items.map((u) => (
            <Card key={u.id} className="flex cursor-pointer items-center gap-4 transition hover:bg-surface-muted/60" onClick={() => navigate(`/staff/${u.id}`)}>
              <Avatar name={u.fullName} size={52} src={u.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate">{u.fullName}</p>
                <p className="truncate text-sm text-text-muted">{u.position}</p>
                <p className="text-sm text-text-muted">{u.phone}</p>
              </div>
              <Badge tone={u.isActive ? 'success' : 'danger'}>{t(u.isActive ? 'staff.active' : 'staff.inactive')}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Academics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('subjects');
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.academics')}
        subtitle={t('academics.subtitle')}
        action={tab === 'tutors' ? <Button onClick={() => navigate('/staff?add=tutor')}><Plus className="h-5 w-5" /> {t('staff.addTutor')}</Button> : undefined}
      />
      <Tabs value={tab} onChange={setTab} tabs={(['subjects', 'clubs', 'tutors'] as Tab[]).map((id) => ({ id, label: t(`academics.tabs.${id}`) }))} />
      {tab === 'subjects' && <SubjectsTab />}
      {tab === 'clubs' && <ClubsTab />}
      {tab === 'tutors' && <TutorsTab />}
    </div>
  );
}
