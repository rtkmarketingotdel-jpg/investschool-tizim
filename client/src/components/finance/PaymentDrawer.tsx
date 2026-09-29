import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Printer, Search } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi, openPdf, PAYMENT_METHODS, type Payment, type PaymentMethod } from '@/lib/financeApi';
import { schoolApi } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { todayLocal } from '@/lib/dates';
import { useDebounce } from '@/lib/useDebounce';
import { Avatar, Button, Drawer, Input, Select, useToast } from '../ui';
import { Textarea } from '../FormBits';

interface Chosen {
  id: string;
  fullName: string;
  className: string | null;
  debt: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-selected student (from the student page). */
  student?: Chosen | null;
}

export function PaymentDrawer({ open, onClose, student }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [period, setPeriod] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState<Payment | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setChosen(student ?? null);
    setAmount(student && student.debt > 0 ? String(student.debt) : '');
    setSearch('');
    setMethod('CASH');
    setPeriod(todayLocal().slice(0, 7));
    setNote('');
    setDone(null);
    setError('');
  }, [open, student]);

  const results = useQuery({
    queryKey: ['payment-student-search', q],
    queryFn: () => schoolApi.students({ q, page: 1, limit: 6, status: 'ACTIVE' }),
    enabled: open && !chosen && q.length >= 2,
  });

  const pay = useMutation({
    mutationFn: () => financeApi.createPayment({ studentId: chosen!.id, amount: Number(amount), method, period: period || null, note: note.trim() || null }),
    onSuccess: (r) => {
      setDone(r.payment);
      toast(t('finance.payments.created'));
      for (const k of ['payments', 'debtors', 'students', 'student', 'dashboard']) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => setError(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') })),
  });

  const cur = t('common.currency');
  const amountNum = Number(amount);
  const valid = !!chosen && Number.isInteger(amountNum) && amountNum >= 1000;

  return (
    <Drawer open={open} onClose={onClose} title={t('finance.payments.receive')}>
      {done ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" />
          <h3 className="text-xl font-semibold">{t('finance.payments.created')}</h3>
          <p className="text-text-muted">{done.studentName} · {formatMoney(done.amount, cur)}</p>
          <div className="flex w-full gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.close')}</Button>
            <Button className="flex-1" onClick={() => void openPdf(`/payments/${done.id}/receipt?lang=${i18n.language}`)}>
              <Printer className="h-5 w-5" /> {t('finance.payments.receipt')}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (valid) pay.mutate();
          }}
        >
          {chosen ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <Avatar name={chosen.fullName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{chosen.fullName}</p>
                <p className="text-sm text-text-muted">{chosen.className ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">{t('finance.payments.currentDebt')}</p>
                <p className={chosen.debt > 0 ? 'font-semibold tabular-nums text-red-600' : 'font-semibold tabular-nums'}>{formatMoney(chosen.debt, cur)}</p>
              </div>
              {!student && (
                <Button type="button" variant="ghost" className="px-3 py-2 text-sm" onClick={() => { setChosen(null); setAmount(''); }}>
                  {t('finance.payments.change')}
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Input label={t('finance.payments.student')} placeholder={t('students.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} autoFocus />
              <ul className="mt-2 space-y-1">
                {results.data?.items.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-muted"
                      onClick={() => {
                        const debt = s.debt ?? 0;
                        setChosen({ id: s.id, fullName: s.fullName, className: s.className, debt });
                        setAmount(debt > 0 ? String(debt) : '');
                      }}
                    >
                      <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                      <span className="flex-1 truncate">{s.fullName}</span>
                      <span className="text-sm text-text-muted">{s.className}</span>
                    </button>
                  </li>
                ))}
                {results.data && results.data.items.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">{t('common.empty')}</li>}
              </ul>
            </div>
          )}

          <Input type="number" min={1000} step={1000} label={`${t('finance.payments.amount')} (${cur})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select label={t('finance.payments.method')} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`finance.methods.${m}`)}</option>)}
          </Select>
          <Input type="month" label={t('finance.payments.period')} value={period} onChange={(e) => setPeriod(e.target.value)} />
          <Textarea label={t('finance.payments.note')} value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={pay.isPending} disabled={!valid}>{t('finance.payments.receive')}</Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
