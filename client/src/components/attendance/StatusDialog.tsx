import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorCode } from '@/lib/api';
import type { AttendanceRecord, AttendanceStatus } from '@/lib/attendanceApi';
import { financeApi } from '@/lib/financeApi';
import { Button, Modal, Select, useToast } from '../ui';
import { Textarea } from '../FormBits';

export function StatusDialog({ record, onClose }: { record: AttendanceRecord | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<AttendanceStatus>('EXCUSED');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (record) { setStatus(record.status); setNote(record.note ?? ''); }
  }, [record]);

  const save = useMutation({
    mutationFn: () => financeApi.setAttendanceStatus(record!.id, status, note.trim() || null),
    onSuccess: () => {
      toast(t('attendance.updated'));
      for (const k of ['attendance', 'dashboard', 'payroll']) void qc.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  return (
    <Modal open={!!record} onClose={onClose} title={`${t('attendance.edit')} · ${record?.user?.fullName ?? ''}`}>
      <div className="space-y-4">
        <Select label={t('attendance.statusCol')} value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
          {(['ON_TIME', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((s) => <option key={s} value={s}>{t(`attendance.status.${s}`)}</option>)}
        </Select>
        {status === 'EXCUSED' && <p className="text-sm text-text-muted">{t('attendance.excusedHint')}</p>}
        <Textarea label={t('attendance.note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
