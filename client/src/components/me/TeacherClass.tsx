import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BedDouble, Check, Copy, MapPin, Phone, Plus, Search, UserX } from 'lucide-react';
import { ageOf, type TeachingClass, type TeachingStudent } from '@/lib/meApi';
import { fmtDay } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { fillOf, fillTone, levelOf, levelTone, Ring, SplitBar } from '../classes/parts';
import { AddClassStudent } from './AddClassStudent';
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
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        <Avatar name={`${s.firstName} ${s.lastName}`} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate">{s.fullName}</p>
          <p className="text-sm text-text-muted">
            {t(s.gender === 'MALE' ? 'me.class.boy' : 'me.class.girl')}
            {age != null && ` · ${t('me.class.age', { count: age })}`}
            {s.birthDate && ` · ${fmtDay(s.birthDate, i18n.language, 'd MMM yyyy')}`}
          </p>
        </div>
        <Badge tone={contractTone[s.contract]}>{s.contract === 'NONE' ? t('finance.contracts.noContract') : t(`finance.contracts.statuses.${s.contract}`)}</Badge>
      </div>
      {(s.status === 'TRIAL' || s.isBoarding || s.clubs.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.status === 'TRIAL' && <Badge tone="warning">{t('students.statuses.TRIAL')}</Badge>}
          {s.isBoarding && <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm text-primary"><BedDouble className="h-3.5 w-3.5" /> {t('students.boarding')}</span>}
          {s.clubs.map((c) => <span key={c} className="rounded-full bg-surface-muted px-3 py-1 text-sm text-text-muted">{c}</span>)}
        </div>
      )}
      <div className="mt-4 space-y-2 rounded-xl bg-surface-muted p-3">
        <p className="text-xs text-text-muted">{t('students.parentName')}</p>
        <p className="text-sm">{s.parentName}</p>
        <div className="flex flex-wrap gap-2">
          <PhoneLink phone={s.parentPhone} />
          {s.parentPhone2 && <PhoneLink phone={s.parentPhone2} />}
        </div>
        {(s.district || s.address) && (
          <p className="flex items-start gap-1.5 text-xs text-text-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {[s.district, s.address].filter(Boolean).join(', ')}</p>
        )}
      </div>
    </article>
  );
}

/** One class in full: how it is doing, who is in it, how to reach every parent, who has no signed contract. */
export function TeacherClass({ classes }: { classes: TeachingClass[] }) {
  const { t } = useTranslation();
  const [id, setId] = useState(classes[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [contract, setContract] = useState('');
  const { copied, copy } = useCopy();
  const [adding, setAdding] = useState(false);
  const c = classes.find((x) => x.id === id) ?? classes[0];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (c?.students ?? []).filter((s) => (!contract || (contract === 'UNSIGNED' ? s.contract !== 'SIGNED' : s.contract === contract)) && (!term || `${s.fullName} ${s.parentName} ${s.parentPhone}`.toLowerCase().includes(term)));
  }, [c, q, contract]);

  if (!c) return <EmptyState icon={UserX} title={t('me.class.none')} text={t('me.class.noneHint')} />;
  const fill = fillOf(c);
  const signed = c.students.filter((s) => s.contract === 'SIGNED').length;
  const unsigned = c.students.length - signed;
  const phones = shown.map((s) => `${s.fullName} — ${s.parentName}: ${s.parentPhone}${s.parentPhone2 ? `, ${s.parentPhone2}` : ''}`).join('\n');

  return (
    <div className="space-y-6">
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('me.class.switch')}>
          {classes.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === c.id} onClick={() => { setId(x.id); setQ(''); setContract(''); }} className={cn('rounded-full border px-5 py-2 text-sm transition', x.id === c.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted')}>{x.name}</button>
          ))}
        </div>
      )}

      <Card className="rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <span className={cn('flex h-20 w-20 items-center justify-center rounded-3xl text-3xl tracking-tight', levelTone[levelOf(c.grade)].chip)}>{c.name}</span>
          <Ring value={c.studentCount} total={c.capacity} fill={fill} size={96}><span className="text-2xl tabular-nums">{c.studentCount}</span></Ring>
          <div className="min-w-48 flex-1 space-y-3">
            <p className="tabular-nums"><span className="text-2xl">{c.studentCount}</span><span className="text-text-muted"> / {c.capacity} {t('me.class.students')}</span></p>
            <div className="space-y-1.5">
              <SplitBar boys={c.boys} girls={c.girls} />
              <p className="flex justify-between text-xs text-text-muted"><span>{t('classes.boys', { count: c.boys })}</span><span>{t('classes.girls', { count: c.girls })}</span></p>
            </div>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.class.fill')}</dt><dd className="mt-1"><span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{c.freeSeats > 0 ? t('classes.free', { count: c.freeSeats }) : t('classes.full')}</span></dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('staff.branch')}</dt><dd className="mt-1 text-sm">{c.branchName ?? '—'}</dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.class.contracts')}</dt><dd className="mt-1 text-sm tabular-nums">{signed} / {c.students.length}</dd></div>
          <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('me.class.unsigned')}</dt><dd className={cn('mt-1 text-sm tabular-nums', unsigned ? 'text-danger' : 'text-success')}>{unsigned}</dd></div>
        </dl>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm"><Input aria-label={t('common.search')} placeholder={t('me.class.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} /></div>
        <div className="w-[calc(50%-0.375rem)] sm:w-52">
          <Select aria-label={t('me.class.contracts')} value={contract} onChange={(e) => setContract(e.target.value)}>
            <option value="">{t('me.class.allContracts')}</option>
            <option value="UNSIGNED">{t('me.class.onlyUnsigned')}</option>
            <option value="SIGNED">{t('finance.contracts.statuses.SIGNED')}</option>
          </Select>
        </div>
        <Button className="px-4 py-3 text-sm" disabled={c.freeSeats === 0} onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t('me.class.add')}
        </Button>
        <Button variant="secondary" className="px-4 py-3 text-sm" disabled={shown.length === 0} onClick={() => void copy('phones', phones)}>
          {copied === 'phones' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t(copied === 'phones' ? 'finance.debtors.copied' : 'me.class.copyPhones')}
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Search} title={t('classes.noMatch')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{shown.map((s) => <StudentCard key={s.id} s={s} />)}</div>
      )}
      <AddClassStudent open={adding} classId={c.id} className={c.name} onClose={() => setAdding(false)} />
    </div>
  );
}
