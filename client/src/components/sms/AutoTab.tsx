import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Play, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { financeApi } from '@/lib/financeApi';
import { smsApi } from '@/lib/smsApi';
import { Button, Card, Input, Select, Skeleton, useToast } from '../ui';
import { Checkbox } from '../FormBits';

export function AutoTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const isDirector = user?.role === 'DIRECTOR';
  const settings = useQuery({ queryKey: ['settings'], queryFn: financeApi.settings, enabled: isDirector });
  const templates = useQuery({ queryKey: ['sms', 'templates'], queryFn: smsApi.templates });
  const [enabled, setEnabled] = useState(false);
  const [every, setEvery] = useState('7');
  const [minDays, setMinDays] = useState('3');
  const [tpl, setTpl] = useState('');
  const [phone, setPhone] = useState('');
  const [testText, setTestText] = useState('');

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setEnabled(s.smsDebtAutoEnabled); setEvery(String(s.smsDebtEveryDays)); setMinDays(String(s.smsDebtMinOverdueDays)); setTpl(s.smsDebtTemplateId ?? '');
  }, [settings.data]);

  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const save = useMutation({
    mutationFn: () => financeApi.saveSettings({ smsDebtAutoEnabled: enabled, smsDebtEveryDays: Number(every), smsDebtMinOverdueDays: Number(minDays), smsDebtTemplateId: tpl || null }),
    onSuccess: (s) => { qc.setQueryData(['settings'], s); toast(t('settings.saved')); }, onError: fail,
  });
  const run = useMutation({ mutationFn: smsApi.runAuto, onSuccess: (r) => { toast(t('sms.auto.ran', { count: r.sent })); void qc.invalidateQueries({ queryKey: ['sms'] }); }, onError: fail });
  const test = useMutation({
    mutationFn: () => smsApi.test(phone, testText),
    onSuccess: (r) => toast(t(r.simulated ? 'sms.auto.testSimulated' : 'sms.auto.testSent')), onError: fail,
  });
  const valid = Number(every) >= 1 && Number(minDays) >= 0 && (!enabled || !!tpl);
  const debtTemplates = (templates.data ?? []).filter((x) => x.category === 'DEBT');

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      {isDirector && (
        <Card className="space-y-4">
          <h3 className="text-lg">{t('sms.auto.title')}</h3>
          <p className="text-sm text-text-muted">{t('sms.auto.hint')}</p>
          {settings.isLoading ? <Skeleton className="h-40" /> : (
            <>
              <Checkbox label={t('sms.auto.enable')} checked={enabled} onChange={setEnabled} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min={0} label={t('sms.auto.minOverdue')} value={minDays} onChange={(e) => setMinDays(e.target.value)} />
                <Input type="number" min={1} label={t('sms.auto.every')} value={every} onChange={(e) => setEvery(e.target.value)} />
              </div>
              <Select label={t('sms.compose.template')} value={tpl} onChange={(e) => setTpl(e.target.value)}>
                <option value="">—</option>
                {debtTemplates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
              <div className="flex flex-wrap gap-3">
                <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>
                <Button variant="secondary" loading={run.isPending} disabled={!enabled} onClick={() => window.confirm(t('sms.auto.runConfirm')) && run.mutate()}><Play className="h-4 w-4" /> {t('sms.auto.runNow')}</Button>
              </div>
            </>
          )}
        </Card>
      )}
      <Card className="space-y-4">
        <h3 className="text-lg">{t('sms.auto.testTitle')}</h3>
        <p className="text-sm text-text-muted">{t('sms.auto.testHint')}</p>
        <Input label={t('staff.phone')} placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label={t('sms.compose.message')} value={testText} onChange={(e) => setTestText(e.target.value)} maxLength={300} />
        <Button disabled={phone.replace(/\D/g, '').length < 9 || !testText.trim()} loading={test.isPending} onClick={() => test.mutate()}><Send className="h-4 w-4" /> {t('sms.auto.testSend')}</Button>
      </Card>
    </div>
  );
}
