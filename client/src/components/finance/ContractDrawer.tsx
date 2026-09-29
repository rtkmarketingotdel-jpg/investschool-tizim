import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi } from '@/lib/financeApi';
import { schoolApi } from '@/lib/schoolApi';
import { useDebounce } from '@/lib/useDebounce';
import { todayLocal } from '@/lib/dates';
import { Avatar, Button, Drawer, Input, Select, useToast } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  student?: { id: string; fullName: string } | null;
}

export function ContractDrawer({ open, onClose, student }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [chosen, setChosen] = useState<{ id: string; fullName: string } | null>(null);
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [templateId, setTemplateId] = useState('');
  const [fee, setFee] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const templates = useQuery({ queryKey: ['templates'], queryFn: financeApi.templates, enabled: open });
  const results = useQuery({ queryKey: ['contract-student-search', q], queryFn: () => schoolApi.students({ q, page: 1, limit: 6, status: 'ACTIVE' }), enabled: open && !chosen && q.length >= 2 });
  const defaults = useQuery({ queryKey: ['contract-defaults', chosen?.id], queryFn: () => financeApi.contractDefaults(chosen!.id), enabled: open && !!chosen });

  useEffect(() => {
    if (!open) return;
    const y = Number(todayLocal().slice(0, 4));
    setChosen(student ?? null);
    setSearch('');
    setStart(`${y}-09-01`);
    setEnd(`${y + 1}-05-31`);
    setError('');
  }, [open, student]);
  useEffect(() => {
    if (defaults.data) setFee(String(defaults.data.monthlyFee));
  }, [defaults.data]);
  useEffect(() => {
    if (open && !templateId && templates.data?.length) setTemplateId((templates.data.find((x) => x.isDefault) ?? templates.data[0])!.id);
  }, [open, templates.data, templateId]);

  const create = useMutation({
    mutationFn: () => financeApi.createContract({ studentId: chosen!.id, templateId, monthlyFee: Number(fee), startDate: start, endDate: end }),
    onSuccess: () => {
      toast(t('finance.contracts.created'));
      void qc.invalidateQueries({ queryKey: ['contracts'] });
      onClose();
    },
    onError: (e) => setError(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') })),
  });
  const valid = !!chosen && !!templateId && Number(fee) >= 0 && fee !== '' && !!start && !!end && end > start;

  return (
    <Drawer open={open} onClose={onClose} title={t('finance.contracts.create')}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setError(''); if (valid) create.mutate(); }}>
        {chosen ? (
          <div className="flex items-center gap-3 rounded-xl border border-border p-4">
            <Avatar name={chosen.fullName} size={44} />
            <div className="flex-1"><p className="font-medium">{chosen.fullName}</p>{defaults.data && <p className="text-sm text-text-muted">{defaults.data.className ?? '—'} · {defaults.data.parentName}</p>}</div>
            {!student && <Button type="button" variant="ghost" className="px-3 py-2 text-sm" onClick={() => setChosen(null)}>{t('finance.payments.change')}</Button>}
          </div>
        ) : (
          <div>
            <Input label={t('finance.payments.student')} placeholder={t('students.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} autoFocus />
            <ul className="mt-2 space-y-1">
              {results.data?.items.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setChosen({ id: s.id, fullName: s.fullName })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-muted">
                    <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                    <span className="flex-1 truncate">{s.fullName}</span>
                    <span className="text-sm text-text-muted">{s.className}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Select label={t('finance.contracts.template')} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
        <Input type="number" min={0} step={100000} label={`${t('students.monthlyFee')} (${t('common.currency')})`} value={fee} onChange={(e) => setFee(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input type="date" label={t('finance.contracts.start')} value={start} onChange={(e) => setStart(e.target.value)} />
          <Input type="date" label={t('finance.contracts.end')} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" className="flex-1" loading={create.isPending} disabled={!valid}>{t('finance.contracts.createDraft')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
