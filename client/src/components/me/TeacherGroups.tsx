import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, Clock, Copy, MapPin, Phone, Plus, Search, UserX } from 'lucide-react';
import { ageOf, type TeachingGroup, type TeachingStudent } from '@/lib/meApi';
import { fmtDay } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { CourseProgress, fillOf, fillTone, Ring, scheduleText, SplitBar, statusTone } from '../groups/parts';
import { AddGroupStudent } from './AddGroupStudent';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, type BadgeTone } from '../ui';

const contractTone: Record<TeachingStudent['contract'], BadgeTone> = { SIGNED: 'success', SENT: 'warning', DRAFT: 'neutral', NONE: 'danger' };

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    },
  };
}

const PhoneLink = ({ phone }: { phone: string }) => (
  <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-muted">
    <Phone className="h-3.5 w-3.5 text-primary" /> <span className="tabular-nums">{phone}</span>
  </a>
);

function StudentCard({ s }: { s: TeachingStudent }) {
  const { t, i18n } = useTranslation();
  const age = ageOf(s.birthDate);
  return (
    <article className="rounded-xl bg-surface p-5">
      <div className="flex items-start gap-4">
        <Avatar name={`${s.firstName} ${s.lastName}`} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate">{s.fullName}</p>
          <p className="text-sm text-text-muted">
            {t(s.gender === 'MALE' ? 'students.male' : 'students.female')}
            {age != null && ` · ${t('me.group.age', { count: age })}`}
            {s.birthDate && ` · ${fmtDay(s.birthDate, i18n.language, 'd MMM yyyy')}`}
          </p>
        </div>
        <Badge tone={contractTone[s.contract]}>{s.contract === 'NONE' ? t('finance.contracts.noContract') : t(`finance.contracts.statuses.${s.contract}`)}</Badge>
      </div>
      {s.status === 'GRADUATED' && <div className="mt-3"><Badge tone="info">{t('students.statuses.GRADUATED')}</Badge></div>}
      <div className="mt-4 space-y-2 rounded-xl bg-surface-muted p-3">
        <div className="flex flex-wrap gap-2">
          <PhoneLink phone={s.phone} />
          {s.phone2 && <PhoneLink phone={s.phone2} />}
        </div>
        {(s.district || s.address) && (
          <p className="flex items-start gap-1.5 text-xs text-text-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {[s.district, s.address].filter(Boolean).join(', ')}</p>
        )}
      </div>
    </article>
  );
}

/** One group in full: schedule and progress, who is in it, how to reach every trainee, who has no signed contract. */
export function TeacherGroups({ groups }: { groups: TeachingGroup[] }) {
  const { t, i18n } = useTranslation();
  // running groups first: that is where the teacher works today
  const ordered = useMemo(() => [...groups].sort((a, b) => Number(a.status === 'FINISHED') - Number(b.status === 'FINISHED')), [groups]);
  const [id, setId] = useState(ordered[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [contract, setContract] = useState('');
  const { copied, copy } = useCopy();
  const [adding, setAdding] = useState(false);
  const g = ordered.find((x) => x.id === id) ?? ordered[0];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (g?.students ?? []).filter((s) => (!contract || (contract === 'UNSIGNED' ? s.contract !== 'SIGNED' : s.contract === contract)) && (!term || `${s.fullName} ${s.phone} ${s.phone2 ?? ''}`.toLowerCase().includes(term)));
  }, [g, q, contract]);

  if (!g) return <EmptyState icon={UserX} title={t('me.group.none')} text={t('me.group.noneHint')} />;
  const fill = fillOf(g);
  const signed = g.students.filter((s) => s.contract === 'SIGNED').length;
  const unsigned = g.students.length - signed;
  const phones = shown.map((s) => `${s.fullName}: ${s.phone}${s.phone2 ? `, ${s.phone2}` : ''}`).join('\n');

  return (
    <div className="space-y-6">
      {ordered.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('me.group.switch')}>
          {ordered.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === g.id} onClick={() => { setId(x.id); setQ(''); setContract(''); }} className={cn('rounded-full border px-5 py-2 text-sm transition', x.id === g.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted')}>
              {x.name}{x.status === 'FINISHED' && <span className="ml-1.5 text-xs">· {t('groups.statuses.FINISHED')}</span>}
            </button>
          ))}
        </div>
      )}

      <Card className="rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-0">
            <span className={cn('inline-flex h-16 min-w-20 items-center justify-center rounded-xl px-3 text-2xl tracking-tight', statusTone[g.status].chip)}>{g.name}</span>
          </div>
          <div className="min-w-48 flex-1 space-y-1.5">
            <p className="text-xl">{g.courseName}</p>
            <p className="flex items-center gap-2 text-sm text-text-muted"><CalendarDays className="h-4 w-4" /> {fmtDay(g.startDate, i18n.language, 'd MMM')} – {fmtDay(g.endDate, i18n.language, 'd MMM yyyy')} · {t(`groups.statuses.${g.status}`)}</p>
            <p className="flex items-center gap-2 text-sm text-text-muted"><Clock className="h-4 w-4" /> {scheduleText(g, t)}{g.room ? ` · ${g.room}` : ''}</p>
            <CourseProgress group={g} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Ring value={g.studentCount} total={g.capacity} fill={fill} size={88}><span className="text-2xl tabular-nums">{g.studentCount}</span></Ring>
          <div className="min-w-48 flex-1 space-y-3">
            <p className="tabular-nums"><span className="text-2xl">{g.studentCount}</span><span className="text-text-muted"> / {g.capacity} {t('groups.studentsShort')}</span></p>
            <div className="space-y-1.5">
              <SplitBar men={g.men} women={g.women} />
              <p className="flex justify-between text-xs text-text-muted"><span>{t('groups.men', { count: g.men })}</span><span>{t('groups.women', { count: g.women })}</span></p>
            </div>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.group.fill')}</dt><dd className="mt-1"><span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{g.freeSeats > 0 ? t('groups.free', { count: g.freeSeats }) : t('groups.full')}</span></dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('staff.branch')}</dt><dd className="mt-1 text-sm">{g.branchName ?? '—'}</dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.group.contracts')}</dt><dd className="mt-1 text-sm tabular-nums">{signed} / {g.students.length}</dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.group.unsigned')}</dt><dd className={cn('mt-1 text-sm tabular-nums', unsigned ? 'text-danger' : 'text-success')}>{unsigned}</dd></div>
        </dl>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm"><Input aria-label={t('common.search')} placeholder={t('me.group.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} /></div>
        <div className="w-[calc(50%-0.375rem)] sm:w-52">
          <Select aria-label={t('me.group.contracts')} value={contract} onChange={(e) => setContract(e.target.value)}>
            <option value="">{t('me.group.allContracts')}</option>
            <option value="UNSIGNED">{t('me.group.onlyUnsigned')}</option>
            <option value="SIGNED">{t('finance.contracts.statuses.SIGNED')}</option>
          </Select>
        </div>
        {g.status !== 'FINISHED' && (
          <Button className="px-4 py-3 text-sm" disabled={g.freeSeats === 0} onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> {t('me.group.add')}
          </Button>
        )}
        <Button variant="secondary" className="px-4 py-3 text-sm" disabled={shown.length === 0} onClick={() => void copy('phones', phones)}>
          {copied === 'phones' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t(copied === 'phones' ? 'finance.debtors.copied' : 'me.group.copyPhones')}
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Search} title={t('groups.noMatch')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{shown.map((s) => <StudentCard key={s.id} s={s} />)}</div>
      )}
      <AddGroupStudent open={adding} groupId={g.id} groupName={g.name} onClose={() => setAdding(false)} />
    </div>
  );
}
