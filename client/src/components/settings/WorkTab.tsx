import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Settings } from '@/lib/financeApi';
import { cn } from '@/lib/cn';
import { Button, Card, Input } from '../ui';
import { numOrNaN, useSaveSettings } from './shared';

export function WorkTab({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const [start, setStart] = useState(settings.workStart);
  const [end, setEnd] = useState(settings.workEnd);
  const [grace, setGrace] = useState(String(settings.graceMinutes));
  const [days, setDays] = useState(settings.workDays);
  const [perMin, setPerMin] = useState(String(settings.lateFinePerMinute));
  const [max, setMax] = useState(String(settings.lateFineMax));
  const [absent, setAbsent] = useState(String(settings.absentFine));

  const valid = !!start && !!end && start < end && numOrNaN(grace) >= 0 && days.length > 0 && numOrNaN(perMin) >= 0 && numOrNaN(max) >= 0 && numOrNaN(absent) >= 0;

  return (
    <Card className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input type="time" label={t('settings.work.start')} value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="time" label={t('settings.work.end')} value={end} onChange={(e) => setEnd(e.target.value)} />
        <Input type="number" min={0} label={t('settings.work.grace')} value={grace} onChange={(e) => setGrace(e.target.value)} />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium">{t('settings.work.days')}</span>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = days.includes(d);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d].sort())}
                className={cn('h-11 min-w-11 rounded-xl border px-3 font-medium', on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted')}>
                {t(`settings.work.day.${d}`)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input type="number" min={0} step={500} label={t('settings.work.finePerMinute')} value={perMin} onChange={(e) => setPerMin(e.target.value)} />
        <Input type="number" min={0} step={1000} label={t('settings.work.fineMax')} value={max} onChange={(e) => setMax(e.target.value)} />
        <Input type="number" min={0} step={1000} label={t('settings.work.absentFine')} value={absent} onChange={(e) => setAbsent(e.target.value)} />
      </div>
      <Button
        disabled={!valid}
        loading={save.isPending}
        onClick={() => save.mutate({ workStart: start, workEnd: end, graceMinutes: Number(grace), workDays: days, lateFinePerMinute: Number(perMin), lateFineMax: Number(max), absentFine: Number(absent) })}
      >
        {t('common.save')}
      </Button>
    </Card>
  );
}
