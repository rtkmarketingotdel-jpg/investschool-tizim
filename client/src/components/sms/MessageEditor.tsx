import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { smsCount } from '@/lib/smsApi';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (v: string) => void;
  vars: string[];
  label?: string;
  rows?: number;
}

/** Textarea with clickable variable chips and a live length / SMS-part counter. */
export function MessageEditor({ value, onChange, vars, label, rows = 5 }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const c = smsCount(value);
  const insert = (v: string) => {
    const el = ref.current;
    const token = `{{${v}}}`;
    if (!el) return onChange(value + token);
    const { selectionStart: a, selectionEnd: b } = el;
    onChange(value.slice(0, a) + token + value.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };
  return (
    <div className="space-y-2">
      {label && <span className="block text-sm">{label}</span>}
      <div className="flex flex-wrap gap-1.5" aria-label={t('sms.compose.variables')}>
        {vars.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)} className="rounded-lg bg-surface-muted px-2 py-1 font-mono text-xs hover:bg-primary-soft hover:text-primary">
            {`{{${v}}}`}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={700}
        aria-label={label ?? t('sms.compose.message')}
        className="w-full rounded-xl border border-border bg-surface-muted p-4 text-text"
      />
      <p className={cn('text-xs', c.segments > 3 ? 'text-warning' : 'text-text-muted')}>
        {t('sms.compose.counter', { length: c.length, limit: c.limit, segments: c.segments })} · {c.gsm ? t('sms.compose.gsm') : t('sms.compose.unicode')}
      </p>
    </div>
  );
}
