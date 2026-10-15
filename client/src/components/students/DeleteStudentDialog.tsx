import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { financeApi } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { schoolApi } from '@/lib/schoolApi';
import { Checkbox } from '../FormBits';
import { Button, Modal, Skeleton, useToast } from '../ui';

interface Props {
  student: { id: string; fullName: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
}

/**
 * Deleting a trainee also deletes their bill, payments and contracts, so the dialog lists them first.
 * A trainee who paid can be deleted only by the director, after ticking that the payments go too.
 */
export function DeleteStudentDialog({ student, onClose, onDeleted }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [agree, setAgree] = useState(false);
  /** set once the delete was sent: the trainee's queries must not run again (they would only 404) */
  const [gone, setGone] = useState<string | null>(null);
  useEffect(() => setAgree(false), [student]);
  const finance = useQuery({ queryKey: ['student', student?.id, 'finance'], queryFn: () => financeApi.studentFinance(student!.id), enabled: !!student && gone !== student.id });
  const contracts = useQuery({ queryKey: ['contracts', 'student', student?.id], queryFn: () => financeApi.contracts({ studentId: student!.id, page: 1, limit: 50 }), enabled: !!student && gone !== student.id });

  const payments = (finance.data?.timeline ?? []).filter((e) => e.kind === 'PAYMENT');
  const hasPayments = payments.length > 0;
  const isDirector = user?.role === 'DIRECTOR';
  const cur = t('common.currency');

  const remove = useMutation({
    mutationFn: () => {
      setGone(student!.id);
      return schoolApi.deleteStudent(student!.id, hasPayments);
    },
    onSuccess: () => {
      toast(t('students.deleted'));
      const id = student!.id;
      onClose();
      onDeleted?.();
      // after the dialog and page let go of them: the deleted trainee's queries are dropped, not refetched (they would only 404)
      setTimeout(() => {
        qc.removeQueries({ queryKey: ['student', id] });
        qc.removeQueries({ queryKey: ['contracts', 'student', id] });
      });
      for (const k of ['students', 'groups', 'debtors', 'payments', 'dashboard']) void qc.invalidateQueries({ queryKey: [k] });
      void qc.invalidateQueries({ queryKey: ['contracts'], predicate: (q) => q.queryKey[1] !== 'student' });
    },
    onError: (e) => {
      setGone(null);
      toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
    },
  });

  const loading = finance.isLoading || contracts.isLoading;
  const blocked = hasPayments && !isDirector;
  return (
    <Modal open={!!student} onClose={onClose} title={t('students.delete')}>
      {loading ? <Skeleton className="h-32" /> : (
        <div className="space-y-4">
          <p>{t('students.deleteConfirm', { name: student?.fullName })}</p>
          <ul className="space-y-1 rounded-xl bg-surface-muted p-4 text-sm text-text-muted">
            <li>{t('students.deleteWhat.bill', { amount: formatMoney(finance.data?.billed ?? 0, cur) })}</li>
            <li className={hasPayments ? 'text-danger' : undefined}>{t('students.deleteWhat.payments', { count: payments.length, amount: formatMoney(finance.data?.paid ?? 0, cur) })}</li>
            <li>{t('students.deleteWhat.contracts', { count: contracts.data?.total ?? 0 })}</li>
          </ul>
          {blocked ? (
            <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t('students.deleteDirectorOnly')}</p>
          ) : hasPayments ? (
            <Checkbox label={t('students.deletePaymentsAgree')} checked={agree} onChange={setAgree} />
          ) : null}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="danger" className="flex-1" loading={remove.isPending} disabled={blocked || (hasPayments && !agree)} onClick={() => remove.mutate()}>{t('students.delete')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
