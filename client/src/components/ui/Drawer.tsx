import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  side?: 'right';
}

export function Drawer({ open, onClose, title, children, width = 560 }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Rendered on <body>: a fixed overlay must never be positioned/clipped by the scrolling layout around it.
  return createPortal(
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-black/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width, maxWidth: '100vw' }}
        className={cn(
          'absolute right-0 top-0 flex h-full flex-col border-l border-border bg-surface transition-transform',
          open ? 'translate-x-0 shadow-2xl' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-xl font-medium">{title}</h2>
          <button aria-label={t('common.close')} onClick={onClose} className="rounded-lg p-2 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
