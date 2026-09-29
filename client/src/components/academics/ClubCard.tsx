import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, TriangleAlert, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import type { Club } from '@/lib/schoolApi';
import { Avatar } from '../ui';
import { cardShell, clubIcon, tintFor } from './parts';

interface Props {
  club: Club;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClubCard({ club: c, onOpen, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const Icon = clubIcon(c.name);
  return (
    <article className={cardShell}>
      <button type="button" onClick={onOpen} className="block w-full p-6 text-left focus-visible:rounded-3xl" aria-label={`${c.name} · ${t('academics.clubMembers')}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', tintFor(c.name))}><Icon className="h-7 w-7" /></span>
          <div className="text-right">
            <p className="text-3xl tabular-nums tracking-tight">{c.members}</p>
            <p className="flex items-center justify-end gap-1.5 text-xs text-text-muted"><Users className="h-3.5 w-3.5" /> {t('academics.membersShort')}</p>
          </div>
        </div>
        <h3 className="mt-5 text-xl leading-snug">{c.name}</h3>
        <p className="mt-1 text-sm text-text-muted">{c.monthlyFee ? t('academics.feePerMonth', { fee: formatMoney(c.monthlyFee, t('common.currency')) }) : t('academics.free')}</p>
        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          {c.teacherName ? (
            <>
              <Avatar name={c.teacherName} size={36} src={c.teacherPhotoUrl} />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">{t('academics.leader')}</p>
                <p className="truncate text-sm">{c.teacherName.split(' ').slice(0, 2).join(' ')}</p>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-warning"><TriangleAlert className="h-4 w-4" /> {t('academics.noLeader')}</p>
          )}
        </div>
      </button>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <button type="button" aria-label={t('common.edit')} title={t('common.edit')} onClick={onEdit} className="rounded-xl p-2 text-text-muted hover:bg-surface-muted hover:text-text"><Pencil className="h-4 w-4" /></button>
        <button type="button" aria-label={t('common.delete')} title={t('common.delete')} onClick={onDelete} className="rounded-xl p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}
