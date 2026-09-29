import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

interface Props {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onChange }: Props) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-text-muted">{t('common.total', { count: total })}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="px-3 py-2" aria-label={t('common.prev')} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm tabular-nums">{page} / {pages}</span>
        <Button variant="secondary" className="px-3 py-2" aria-label={t('common.next')} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
