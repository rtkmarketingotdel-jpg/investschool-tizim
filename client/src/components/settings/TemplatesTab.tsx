import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi, openPdf, type Template } from '@/lib/financeApi';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, Input, Select, Skeleton, useToast } from '../ui';
import { Checkbox } from '../FormBits';

const PLACEHOLDERS = ['contractNumber', 'date', 'schoolLegalName', 'schoolInn', 'schoolAddress', 'director', 'parentName', 'parentPhone', 'studentFullName', 'studentBirthDate', 'className', 'monthlyFee', 'monthlyFeeWords', 'startDate', 'endDate'];
const NEW: Omit<Template, 'id'> = { name: '', language: 'uz', body: '## 1. \n', isDefault: false };

export function TemplatesTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['templates'], queryFn: financeApi.templates });
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Template, 'id'>>(NEW);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selected === null && list.data?.length) setSelected(list.data[0]!.id);
  }, [list.data, selected]);
  useEffect(() => {
    if (selected === 'new') setForm(NEW);
    else if (selected) {
      const tpl = list.data?.find((x) => x.id === selected);
      if (tpl) setForm({ name: tpl.name, language: tpl.language, body: tpl.body, isDefault: tpl.isDefault });
    }
  }, [selected, list.data]);

  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const save = useMutation({
    mutationFn: () => financeApi.saveTemplate(selected === 'new' ? null : selected, form),
    onSuccess: (tpl) => { toast(t('settings.saved')); void qc.invalidateQueries({ queryKey: ['templates'] }); setSelected(tpl.id); },
    onError: fail,
  });
  const del = useMutation({
    mutationFn: () => financeApi.deleteTemplate(selected!),
    onSuccess: () => { toast(t('settings.templates.deleted')); setSelected(null); void qc.invalidateQueries({ queryKey: ['templates'] }); },
    onError: fail,
  });

  const insert = (key: string) => {
    const el = area.current;
    const token = `{{${key}}}`;
    if (!el) return setForm((f) => ({ ...f, body: f.body + token }));
    const { selectionStart: a, selectionEnd: b } = el;
    setForm((f) => ({ ...f, body: f.body.slice(0, a) + token + f.body.slice(b) }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + token.length, a + token.length); });
  };

  if (list.isLoading) return <Skeleton className="h-96" />;
  const valid = form.name.trim().length > 0 && form.body.trim().length >= 20;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="space-y-2 self-start p-3">
        {list.data?.map((x) => (
          <button key={x.id} onClick={() => setSelected(x.id)} className={cn('flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left', selected === x.id ? 'bg-primary-soft text-primary' : 'hover:bg-surface-muted')}>
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">{x.name}</span>
            <Badge>{x.language.toUpperCase()}</Badge>
          </button>
        ))}
        <Button variant="secondary" className="w-full px-3 py-2 text-sm" onClick={() => setSelected('new')}><Plus className="h-4 w-4" /> {t('settings.templates.new')}</Button>
      </Card>

      {selected && (
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Input label={t('settings.templates.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label={t('settings.templates.language')} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as 'uz' | 'ru' })}>
              <option value="uz">Oʻzbekcha</option>
              <option value="ru">Русский</option>
            </Select>
          </div>
          <Checkbox label={t('settings.templates.default')} checked={form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} />
          <div>
            <span className="mb-1.5 block text-sm font-medium">{t('settings.templates.placeholders')}</span>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => <button key={p} type="button" onClick={() => insert(p)} className="rounded-lg bg-surface-muted px-2 py-1 font-mono text-xs hover:bg-primary-soft hover:text-primary">{`{{${p}}}`}</button>)}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('settings.templates.body')}</span>
            <textarea ref={area} rows={18} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-xl border border-border bg-surface-muted p-4 font-mono text-sm" />
            <span className="mt-1 block text-xs text-text-muted">{t('settings.templates.hint')}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>
            <Button variant="secondary" disabled={!valid} onClick={() => void openPdf('/contracts/templates/sample-pdf', 'post', { body: form.body, language: form.language }).catch(fail)}>{t('settings.templates.samplePdf')}</Button>
            {selected !== 'new' && <Button variant="ghost" className="text-red-600" loading={del.isPending} onClick={() => window.confirm(t('settings.templates.deleteConfirm')) && del.mutate()}><Trash2 className="h-4 w-4" /> {t('settings.templates.delete')}</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
