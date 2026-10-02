import { useTranslation } from 'react-i18next';
import { Check, Copy, Phone, Trophy, Users } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { TeachingClub } from '@/lib/meApi';
import { clubIcon, tintFor } from '../academics/parts';
import { cn } from '@/lib/cn';
import { Avatar, Button, Card, EmptyState } from '../ui';
import { useCopy } from './TeacherClass';

export function TeacherClubs({ clubs }: { clubs: TeachingClub[] }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy();
  if (clubs.length === 0) return <EmptyState icon={Trophy} title={t('me.clubs.none')} text={t('me.clubs.noneHint')} />;
  return (
    <div className="space-y-6">
      {clubs.map((c) => {
        const Icon = clubIcon(c.name);
        const phones = c.members.map((m) => `${m.fullName} — ${m.parentName}: ${m.parentPhone}`).join('\n');
        return (
          <Card key={c.id} className="space-y-4 rounded-3xl p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', tintFor(c.name))}><Icon className="h-7 w-7" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xl">{c.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-text-muted"><Users className="h-4 w-4" /> {t('me.clubs.members', { count: c.members.length })}{c.monthlyFee ? ` · ${t('academics.feePerMonth', { fee: formatMoney(c.monthlyFee, t('common.currency')) })}` : ''}</p>
              </div>
              <Button variant="secondary" className="px-4 py-2.5 text-sm" disabled={c.members.length === 0} onClick={() => void copy(c.id, phones)}>
                {copied === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t(copied === c.id ? 'finance.debtors.copied' : 'me.class.copyPhones')}
              </Button>
            </div>
            {c.members.length === 0 ? <p className="py-4 text-center text-sm text-text-muted">{t('academics.noMembers')}</p> : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {c.members.map((m, i) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="w-6 text-sm text-text-muted tabular-nums">{i + 1}</span>
                    <Avatar name={m.fullName} size={36} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{m.fullName}</p><p className="text-xs text-text-muted">{m.className ?? '—'} · {m.parentName}</p></div>
                    <a href={`tel:${m.parentPhone}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-muted"><Phone className="h-3.5 w-3.5 text-primary" /> <span className="tabular-nums">{m.parentPhone}</span></a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
