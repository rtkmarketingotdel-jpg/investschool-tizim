import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Printer, Search } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi, openPdf, PAYMENT_METHODS, type Payment, type PaymentMethod } from '@/lib/financeApi';
import { schoolApi } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { useDebounce } from '@/lib/useDebounce';
import { Avatar, Button, Drawer, Input, Select, useToast } from '../ui';
import { Textarea } from '../FormBits';

interface Chosen {
  id: string;
  fullName: string;
  groupName: string | null;
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
  const [note, setNote] = useState('');
  const [done, setDone] = useState<{ payment: Payment; debt: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setChosen(student ?? null);
    setAmount(student && student.debt > 0 ? String(student.debt) : '');
    setSearch('');
    setMethod('CASH');
    setNote('');
    setDone(null);
    setError('');
  }, [open, student]);

  const results = useQuery({
    queryKey: ['payment-student-search', q],
    // graduates and drop-outs can still pay off what they owe
    queryFn: () => schoolApi.students({ q, page: 1, limit: 6 }),
    enabled: open && !chosen && q.length >= 2,
  });

  const pay = useMutation({
    mutationFn: () => financeApi.createPayment({ studentId: chosen!.id, amount: Number(amount), method, note: note.trim() || null }),
    onSuccess: (r) => {
      setDone(r);
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
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h3 className="text-xl font-medium">{t('finance.payments.created')}</h3>
          <p className="text-text-muted">{done.payment.studentName} · {formatMoney(done.payment.amount, cur)}</p>
          <p className={done.debt > 0 ? 'text-sm text-danger' : 'text-sm text-success'}>
            {done.debt > 0 ? `${t('finance.payments.debtLeft')}: ${formatMoney(done.debt, cur)}` : t('finance.payments.fullyPaid')}
          </p>
          <div className="flex w-full gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.close')}</Button>
            <Button className="flex-1" onClick={() => void openPdf(`/payments/${done.payment.id}/receipt?lang=${i18n.language}`)}>
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
                <p className="text-sm text-text-muted">{chosen.groupName ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">{t('finance.payments.currentDebt')}</p>
                <p className={chosen.debt > 0 ? 'font-medium tabular-nums text-danger' : 'font-medium tabular-nums'}>{formatMoney(chosen.debt, cur)}</p>
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
                        setChosen({ id: s.id, fullName: s.fullName, groupName: s.groupName, debt });
                        setAmount(debt > 0 ? String(debt) : '');
                      }}
                    >
                      <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                      <span className="flex-1 truncate">{s.fullName}</span>
                      <span className="text-sm text-text-muted">{s.groupName}</span>
                    </button>
                  </li>
                ))}
                {results.data && results.data.items.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">{t('common.empty')}</li>}
              </ul>
            </div>
          )}

          <Input type="number" min={1000} step={1000} label={`${t('finance.payments.amount')} (${cur})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          {chosen && chosen.debt > 0 && (
            <div className="-mt-2 flex flex-wrap gap-2">
              {[1, 0.5].map((part) => {
                const v = Math.round((chosen.debt * part) / 1000) * 1000;
                return (
                  <button key={part} type="button" onClick={() => setAmount(String(v))} className="rounded-full border border-border px-3 py-1 text-sm text-text-muted hover:bg-surface-muted">
                    {part === 1 ? t('finance.payments.payAll') : t('finance.payments.payHalf')} · {formatMoney(v, cur)}
                  </button>
                );
              })}
            </div>
          )}
          <Select label={t('finance.payments.method')} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`finance.methods.${m}`)}</option>)}
          </Select>
          <Textarea label={t('finance.payments.note')} value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={pay.isPending} disabled={!valid}>{t('finance.payments.receive')}</Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
