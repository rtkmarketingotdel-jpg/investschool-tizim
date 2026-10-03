import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Gift, Send, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { schoolApi } from '@/lib/schoolApi';
import { todayLocal } from '@/lib/dates';
import { useDebounce } from '@/lib/useDebounce';
import { cn } from '@/lib/cn';
import { PARENT_VARS, SMS_CATEGORIES, STAFF_VARS, smsApi, type Audience, type SmsCategory } from '@/lib/smsApi';
import { Button, Card, Input, Modal, Select, Skeleton, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { MessageEditor } from './MessageEditor';

type Kind = Audience['kind'];

/** Holidays with a ready greeting; the date is the next occurrence (sent at 09:00). Eid has no fixed date. */
const HOLIDAYS = [
  { key: 'navruz', month: 3, day: 21, tpl: 'st4', kind: 'ALL_PARENTS' as Kind },
  { key: 'women', month: 3, day: 8, tpl: 'st7', kind: 'ALL_PARENTS' as Kind },
  { key: 'independence', month: 9, day: 1, tpl: 'st5', kind: 'ALL_PARENTS' as Kind },
  { key: 'teachers', month: 10, day: 1, tpl: 'st8', kind: 'STAFF' as Kind },
  { key: 'newyear', month: 12, day: 31, tpl: 'st6', kind: 'ALL_PARENTS' as Kind },
  { key: 'eid', month: 0, day: 0, tpl: 'st9', kind: 'ALL_PARENTS' as Kind },
];

function nextOccurrence(month: number, day: number): string {
  const today = todayLocal();
  const year = Number(today.slice(0, 4));
  const d = (y: number) => `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return d(d(year) >= today ? year : year + 1);
}

const splitNumbers = (s: string) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

export function ComposeTab({ onSent }: { onSent: (campaignId: string) => void }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const canFinance = user?.role !== 'TEACHER';

  const [category, setCategory] = useState<SmsCategory>(canFinance ? 'DEBT' : 'WARNING');
  const [kind, setKind] = useState<Kind>(canFinance ? 'DEBTORS' : 'ALL_PARENTS');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState('');
  const [minOverdue, setMinOverdue] = useState('0');
  const [scope, setScope] = useState<'ALL' | 'TEACHERS' | 'TUTORS'>('ALL');
  const [numbers, setNumbers] = useState('');
  const [bothPhones, setBothPhones] = useState(false);
  const [lang, setLang] = useState<'uz' | 'ru'>(i18n.language === 'ru' ? 'ru' : 'uz');
  const [text, setText] = useState('');
  const [tplId, setTplId] = useState('');
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState('');
  const [confirm, setConfirm] = useState(false);

  const templates = useQuery({ queryKey: ['sms', 'templates'], queryFn: smsApi.templates });
  const status = useQuery({ queryKey: ['sms', 'status'], queryFn: smsApi.status });
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });

  const audience: Audience | null = useMemo(() => {
    switch (kind) {
      case 'CLASSES': return classIds.length ? { kind, classIds } : null;
      case 'BRANCH': return branchId ? { kind, branchId } : null;
      case 'DEBTORS': return { kind, minOverdueDays: Math.max(0, Number(minOverdue) || 0) };
      case 'STAFF': return { kind, scope, branchId: branchId || null };
      case 'NUMBERS': { const n = splitNumbers(numbers); return n.length ? { kind, numbers: n } : null; }
      default: return { kind: 'ALL_PARENTS' };
    }
  }, [kind, classIds, branchId, minOverdue, scope, numbers]);

  const debouncedText = useDebounce(text, 400);
  const compose = audience && debouncedText.trim() ? { audience, text: debouncedText, bothPhones, lang } : null;
  const preview = useQuery({ queryKey: ['sms', 'preview', compose], queryFn: () => smsApi.preview(compose!), enabled: !!compose, retry: false });

  useEffect(() => {
    // a fresh category starts with a sensible audience
    setKind(category === 'DEBT' && canFinance ? 'DEBTORS' : kind === 'DEBTORS' && category !== 'DEBT' ? 'ALL_PARENTS' : kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const pickTemplate = (id: string) => {
    setTplId(id);
    const tpl = templates.data?.find((x) => x.id === id);
    if (tpl) { setText(tpl.body); setLang(tpl.language); }
  };
  const pickHoliday = (h: (typeof HOLIDAYS)[number]) => {
    setCategory('GREETING');
    setKind(h.kind);
    if (h.kind === 'STAFF') setScope('ALL');
    pickTemplate(h.tpl);
    if (h.month) { setLater(true); setWhen(`${nextOccurrence(h.month, h.day)}T09:00`); } else setLater(false);
  };

  const send = useMutation({
    mutationFn: () => smsApi.send({ audience: audience!, text, bothPhones, lang, category, title: '', scheduleAt: later && when ? new Date(`${when}:00+05:00`).toISOString() : null }),
    onSuccess: (c) => { setConfirm(false); toast(t(later ? 'sms.compose.scheduled' : 'sms.compose.sending')); setText(''); setTplId(''); onSent(c.id); },
    onError: (e) => { setConfirm(false); toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'); },
  });

  const vars = (kind === 'STAFF' ? STAFF_VARS : kind === 'NUMBERS' ? ['school'] : PARENT_VARS).filter((v) => canFinance || !['debt', 'overdueDays', 'month'].includes(v));
  const tplList = (templates.data ?? []).filter((x) => x.language === lang && (category === 'OTHER' || x.category === category));
  const isParents = kind !== 'STAFF' && kind !== 'NUMBERS';
  const previewError = preview.isError ? errorCode(preview.error) : null;
  const badVars = preview.isError && previewError === 'SMS_BAD_VARIABLE' ? ((preview.error as { response?: { data?: { details?: { variables?: string[] } } } }).response?.data?.details?.variables ?? []) : [];
  const canSend = !!audience && !!text.trim() && !!preview.data && preview.data.count > 0 && (!later || !!when);
  const cats = SMS_CATEGORIES.filter((c) => canFinance || c !== 'DEBT');

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card className="space-y-3">
          <h3 className="text-lg">{t('sms.compose.type')}</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('sms.compose.type')}>
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cn('rounded-full border px-4 py-2 text-sm', category === c ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted')}>
                {t(`sms.categories.${c}`)}
              </button>
            ))}
          </div>
          {category === 'GREETING' && (
            <div className="space-y-2 pt-1">
              <p className="flex items-center gap-2 text-sm text-text-muted"><Gift className="h-4 w-4" /> {t('sms.compose.holidays')}</p>
              <div className="flex flex-wrap gap-2">
                {HOLIDAYS.map((h) => (
                  <button key={h.key} type="button" onClick={() => pickHoliday(h)} className="rounded-xl border border-border px-3 py-1.5 text-left text-sm hover:bg-surface-muted">
                    {t(`sms.holidays.${h.key}`)}
                    {h.month > 0 && <span className="block text-xs text-text-muted">{nextOccurrence(h.month, h.day).split('-').reverse().slice(0, 2).join('.')}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h3 className="text-lg">{t('sms.compose.audience')}</h3>
          <Select aria-label={t('sms.compose.audience')} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="ALL_PARENTS">{t('sms.audience.ALL_PARENTS')}</option>
            <option value="CLASSES">{t('sms.audience.CLASSES')}</option>
            <option value="BRANCH">{t('sms.audience.BRANCH')}</option>
            {canFinance && <option value="DEBTORS">{t('sms.audience.DEBTORS')}</option>}
            <option value="STAFF">{t('sms.audience.STAFF')}</option>
            <option value="NUMBERS">{t('sms.audience.NUMBERS')}</option>
          </Select>
          {kind === 'CLASSES' && (
            <div className="flex flex-wrap gap-2">
              {classes.data?.map((c) => {
                const on = classIds.includes(c.id);
                return <button key={c.id} type="button" aria-pressed={on} onClick={() => setClassIds(on ? classIds.filter((x) => x !== c.id) : [...classIds, c.id])} className={cn('rounded-full border px-3 py-1.5 text-sm', on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted')}>{c.name}</button>;
              })}
            </div>
          )}
          {(kind === 'BRANCH' || kind === 'STAFF') && (
            <Select aria-label={t('staff.branch')} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{kind === 'STAFF' ? t('sms.audience.anyBranch') : '—'}</option>
              {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
          {kind === 'DEBTORS' && <Input type="number" min={0} label={t('sms.audience.minOverdue')} value={minOverdue} onChange={(e) => setMinOverdue(e.target.value)} />}
          {kind === 'STAFF' && (
            <Select aria-label={t('staff.type')} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="ALL">{t('sms.audience.staffAll')}</option>
              <option value="TEACHERS">{t('staff.teachersOnly')}</option>
              <option value="TUTORS">{t('staff.tutorsOnly')}</option>
            </Select>
          )}
          {kind === 'NUMBERS' && (
            <label className="block">
              <span className="mb-1.5 block text-sm">{t('sms.audience.numbersLabel')}</span>
              <textarea rows={3} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="+998 90 123 45 67" className="w-full rounded-xl border border-border bg-surface-muted p-3" />
            </label>
          )}
          {isParents && <Checkbox label={t('sms.audience.bothPhones')} checked={bothPhones} onChange={setBothPhones} />}
        </Card>

        <Card className="space-y-4">
          <h3 className="text-lg">{t('sms.compose.message')}</h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Select aria-label={t('sms.compose.template')} value={tplId} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">{t('sms.compose.writeOwn')}</option>
              {tplList.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
            <div className="flex rounded-xl border border-border bg-surface-muted p-1" role="group" aria-label={t('sms.compose.language')}>
              {(['uz', 'ru'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn('rounded-lg px-4 py-2 text-sm', lang === l ? 'bg-surface text-primary shadow' : 'text-text-muted')}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <MessageEditor value={text} onChange={setText} vars={vars} />
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg">{t('sms.compose.when')}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-xl border border-border bg-surface-muted p-1" role="group">
              <button type="button" aria-pressed={!later} onClick={() => setLater(false)} className={cn('rounded-lg px-4 py-2 text-sm', !later ? 'bg-surface text-primary shadow' : 'text-text-muted')}>{t('sms.compose.now')}</button>
              <button type="button" aria-pressed={later} onClick={() => setLater(true)} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm', later ? 'bg-surface text-primary shadow' : 'text-text-muted')}><CalendarClock className="h-4 w-4" /> {t('sms.compose.later')}</button>
            </div>
            {later && <div className="w-64"><Input type="datetime-local" aria-label={t('sms.compose.when')} value={when} min={`${todayLocal()}T00:00`} onChange={(e) => setWhen(e.target.value)} /></div>}
          </div>
          {later && <p className="text-xs text-text-muted">{t('sms.compose.whenHint')}</p>}
        </Card>
      </div>

      <div className="xl:sticky xl:top-0 xl:self-start">
        <Card className="space-y-4">
          <h3 className="text-lg">{t('sms.compose.preview')}</h3>
          {!compose ? (
            <p className="text-sm text-text-muted">{t('sms.compose.previewEmpty')}</p>
          ) : preview.isLoading ? (
            <Skeleton className="h-40" />
          ) : preview.isError ? (
            <p role="alert" className="text-sm text-danger">
              {previewError === 'SMS_BAD_VARIABLE' ? t('errors.SMS_BAD_VARIABLE', { list: badVars.map((v) => `{{${v}}}`).join(', ') }) : t(`errors.${previewError}`, { defaultValue: t('errors.INTERNAL_ERROR') })}
            </p>
          ) : preview.data && (
            <>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-muted">{t('sms.compose.recipients')}</dt><dd className="text-2xl tabular-nums">{preview.data.count}</dd></div>
                <div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-muted">{t('sms.compose.totalSegments')}</dt><dd className="text-2xl tabular-nums">{preview.data.segments}</dd></div>
              </dl>
              {(preview.data.invalidPhones > 0 || preview.data.duplicates > 0) && (
                <p className="text-xs text-text-muted">{t('sms.compose.skipped', { invalid: preview.data.invalidPhones, duplicates: preview.data.duplicates })}</p>
              )}
              {preview.data.count === 0 && <p role="alert" className="text-sm text-warning">{t('errors.SMS_NO_RECIPIENTS')}</p>}
              <ul className="space-y-2">
                {preview.data.sample.map((m) => (
                  <li key={m.phone + m.text} className="rounded-xl border border-border p-3 text-sm">
                    <p className="mb-1 text-xs text-text-muted">{m.name} · {m.phone} · {t('sms.compose.parts', { count: m.segments })}</p>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button className="w-full" disabled={!canSend} onClick={() => setConfirm(true)}><Send className="h-5 w-5" /> {t(later ? 'sms.compose.schedule' : 'sms.compose.send')}</Button>
        </Card>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title={t('sms.compose.confirmTitle')}>
        <div className="space-y-3">
          <p>{t('sms.compose.confirmText', { count: preview.data?.count ?? 0, segments: preview.data?.segments ?? 0 })}</p>
          {later && when && <p className="text-sm text-text-muted">{t('sms.compose.confirmWhen', { when: when.replace('T', ' ') })}</p>}
          {status.data?.simulated && (
            <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t('sms.status.demoConfirm')}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" loading={send.isPending} onClick={() => send.mutate()}>{t(later ? 'sms.compose.schedule' : 'sms.compose.send')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
