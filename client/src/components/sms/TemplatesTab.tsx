import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { PARENT_VARS, SMS_CATEGORIES, smsApi, type SmsTemplate } from '@/lib/smsApi';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, useToast } from '../ui';
import { MessageEditor } from './MessageEditor';

type Draft = { id: string | null; name: string; category: SmsTemplate['category']; language: 'uz' | 'ru'; body: string };
const EMPTY: Draft = { id: null, name: '', category: 'GREETING', language: 'uz', body: '' };

export function TemplatesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canFinance = user?.role !== 'TEACHER';
  const list = useQuery({ queryKey: ['sms', 'templates'], queryFn: smsApi.templates });
  const [draft, setDraft] = useState<Draft | null>(null);
  const done = () => { void qc.invalidateQueries({ queryKey: ['sms', 'templates'] }); };
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const save = useMutation({
    mutationFn: () => smsApi.saveTemplate(draft!.id, { name: draft!.name.trim(), category: draft!.category, language: draft!.language, body: draft!.body }),
    onSuccess: () => { toast(t('sms.templates.saved')); setDraft(null); done(); }, onError: fail,
  });
  const del = useMutation({ mutationFn: (id: string) => smsApi.deleteTemplate(id), onSuccess: () => { toast(t('academics.deleted')); done(); }, onError: fail });
  const valid = !!draft && draft.name.trim().length >= 2 && draft.body.trim().length >= 5;
  const vars = PARENT_VARS.filter((v) => canFinance || !['debt', 'overdueDays', 'month'].includes(v)).concat('name', 'position');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-text-muted">{t('sms.templates.hint')}</p>
        <Button onClick={() => setDraft(EMPTY)}><Plus className="h-5 w-5" /> {t('sms.templates.add')}</Button>
      </div>
      {list.isLoading ? <Skeleton className="h-64" /> : !list.data?.length ? <EmptyState icon={MessageSquareText} title={t('common.empty')} /> : (
        SMS_CATEGORIES.map((cat) => {
          const items = list.data.filter((x) => x.category === cat);
          return items.length === 0 ? null : (
            <section key={cat} className="space-y-3">
              <h3 className="text-lg">{t(`sms.categories.${cat}`)}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((x) => (
                  <Card key={x.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p>{x.name}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge>{x.language.toUpperCase()}</Badge>
                        <button aria-label={t('common.edit')} onClick={() => setDraft({ id: x.id, name: x.name, category: x.category, language: x.language, body: x.body })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={t('common.delete')} onClick={() => window.confirm(t('sms.templates.deleteConfirm', { name: x.name })) && del.mutate(x.id)} className="rounded-lg p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-text-muted">{x.body}</p>
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}
      <Modal open={!!draft} onClose={() => setDraft(null)} title={t(draft?.id ? 'sms.templates.edit' : 'sms.templates.add')}>
        {draft && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }}>
            <Input label={t('academics.name')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <Select label={t('sms.compose.type')} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })}>
                {SMS_CATEGORIES.filter((c) => canFinance || c !== 'DEBT').map((c) => <option key={c} value={c}>{t(`sms.categories.${c}`)}</option>)}
              </Select>
              <Select label={t('sms.compose.language')} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as 'uz' | 'ru' })}>
                <option value="uz">Oʻzbekcha</option>
                <option value="ru">Русский</option>
              </Select>
            </div>
            <MessageEditor value={draft.body} onChange={(body) => setDraft({ ...draft, body })} vars={vars} label={t('sms.compose.message')} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1" disabled={!valid} loading={save.isPending}>{t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
