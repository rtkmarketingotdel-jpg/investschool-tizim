import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, ClipboardPaste, GripVertical, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Topic } from '@/lib/plansApi';
import { Button, Input, Modal } from '../ui';
import { Textarea } from '../FormBits';

/** A topic being edited; `key` keeps React rows stable for topics that have no id yet. */
export type DraftTopic = Topic & { key: string };

let seq = 0;
export const draftOf = (t: Topic): DraftTopic => ({ ...t, key: t.id ?? `new-${++seq}` });
const blank = (title = ''): DraftTopic => draftOf({ title, description: null, kind: 'THEORY', lessons: 1, materials: null });

/** "1. Mavzu", "- Mavzu", "• Mavzu" → "Mavzu": numbering and bullets of a pasted list are dropped. */
export const parsePasted = (text: string) =>
  text.split('\n').map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•–])\s*/, '').trim()).filter(Boolean);

interface Props {
  topics: DraftTopic[];
  onChange: (topics: DraftTopic[]) => void;
}

/** Editable, re-orderable list of plan topics (drag the handle, or use the arrows on a phone). */
export function TopicEditor({ topics, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');

  const patch = (key: string, p: Partial<Topic>) => onChange(topics.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= topics.length || from === to) return;
    const next = [...topics];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  const add = () => {
    const n = blank();
    onChange([...topics, n]);
    setOpen(n.key);
  };
  const lines = parsePasted(pasted);

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {topics.map((x, i) => {
          const expanded = open === x.key;
          return (
            <li
              key={x.key}
              onDragOver={(e) => { e.preventDefault(); setOverKey(x.key); }}
              onDrop={(e) => {
                e.preventDefault();
                const from = topics.findIndex((y) => y.key === dragKey);
                if (from >= 0) move(from, i);
                setDragKey(null);
                setOverKey(null);
              }}
              className={cn('rounded-xl border bg-surface transition', overKey === x.key && dragKey && dragKey !== x.key ? 'border-primary' : 'border-border', dragKey === x.key && 'opacity-50')}
            >
              <div className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
                <span
                  draggable
                  onDragStart={() => setDragKey(x.key)}
                  onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                  className="hidden cursor-grab text-text-muted active:cursor-grabbing sm:block"
                  aria-hidden
                >
                  <GripVertical className="h-5 w-5" />
                </span>
                <span className="w-7 shrink-0 text-center text-sm tabular-nums text-text-muted">{i + 1}</span>
                <input
                  aria-label={t('plans.topic.title')}
                  placeholder={t('plans.topic.titlePlaceholder')}
                  value={x.title}
                  maxLength={200}
                  onChange={(e) => patch(x.key, { title: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-surface-muted"
                />
                <button
                  type="button"
                  onClick={() => patch(x.key, { kind: x.kind === 'THEORY' ? 'PRACTICE' : 'THEORY' })}
                  className={cn('hidden shrink-0 rounded-full px-3 py-1 text-xs sm:block', x.kind === 'THEORY' ? 'bg-primary-soft text-primary' : 'bg-success/10 text-success')}
                  title={t('plans.topic.kindToggle')}
                >
                  {t(`plans.kind.${x.kind}`)}
                </button>
                <label className="hidden shrink-0 items-center gap-1 text-sm text-text-muted sm:flex">
                  <input type="number" min={1} max={20} value={x.lessons} onChange={(e) => patch(x.key, { lessons: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
                    className="w-14 rounded-lg border border-border bg-surface-muted px-2 py-1 text-center tabular-nums" aria-label={t('plans.topic.lessons')} />
                  {t('plans.topic.lessonsShort')}
                </label>
                <div className="flex shrink-0">
                  <button type="button" aria-label={t('plans.moveUp')} disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" aria-label={t('plans.moveDown')} disabled={i === topics.length - 1} onClick={() => move(i, i + 1)} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : x.key)} className="rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-surface-muted">{t(expanded ? 'plans.less' : 'plans.more')}</button>
                  <button type="button" aria-label={t('common.delete')} onClick={() => onChange(topics.filter((y) => y.key !== x.key))} className="rounded-lg p-1.5 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {expanded && (
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                  {/* on a phone the kind and length live here */}
                  <div className="flex gap-2 sm:hidden">
                    {(['THEORY', 'PRACTICE'] as const).map((k) => (
                      <button key={k} type="button" aria-pressed={x.kind === k} onClick={() => patch(x.key, { kind: k })}
                        className={cn('flex-1 rounded-xl border px-3 py-2 text-sm', x.kind === k ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted')}>
                        {t(`plans.kind.${k}`)}
                      </button>
                    ))}
                  </div>
                  <div className="sm:hidden">
                    <Input type="number" min={1} max={20} label={t('plans.topic.lessons')} value={x.lessons} onChange={(e) => patch(x.key, { lessons: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
                  </div>
                  <Textarea label={t('plans.topic.description')} value={x.description ?? ''} maxLength={1000} onChange={(e) => patch(x.key, { description: e.target.value || null })} />
                  <Textarea label={t('plans.topic.materials')} value={x.materials ?? ''} maxLength={500} onChange={(e) => patch(x.key, { materials: e.target.value || null })} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={add}><Plus className="h-4 w-4" /> {t('plans.addTopic')}</Button>
        <Button type="button" variant="secondary" onClick={() => { setPasted(''); setPasting(true); }}><ClipboardPaste className="h-4 w-4" /> {t('plans.paste')}</Button>
      </div>

      <Modal open={pasting} onClose={() => setPasting(false)} title={t('plans.paste')}>
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{t('plans.pasteHint')}</p>
          <Textarea aria-label={t('plans.paste')} rows={10} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={t('plans.pastePlaceholder')} autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setPasting(false)}>{t('common.cancel')}</Button>
            <Button type="button" className="flex-1" disabled={!lines.length} onClick={() => { onChange([...topics, ...lines.map((l) => blank(l.slice(0, 200)))]); setPasting(false); }}>
              {t('plans.pasteAdd', { count: lines.length })}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
