import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Search, Users } from 'lucide-react';
import { useAuth, isManagement } from '@/context/AuthContext';
import { schoolApi } from '@/lib/schoolApi';
import { useDebounce } from '@/lib/useDebounce';

export function GlobalSearch() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const q = useDebounce(text.trim(), 300);
  const box = useRef<HTMLDivElement>(null);
  const canStaff = isManagement(user?.role);

  const students = useQuery({ queryKey: ['gs', 'students', q], queryFn: () => schoolApi.students({ q, page: 1, limit: 5 }), enabled: q.length >= 2 });
  const staff = useQuery({ queryKey: ['gs', 'staff', q], queryFn: () => schoolApi.staff({ q, page: 1, limit: 5 }), enabled: q.length >= 2 && canStaff });

  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setText('');
    navigate(to);
  };
  const s = students.data?.items ?? [];
  const st = staff.data?.items ?? [];

  return (
    <div ref={box} className="relative hidden w-full max-w-md sm:block">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        aria-label={t('topbar.search')}
        placeholder={t('topbar.search')}
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && text.trim() && go(`/students?q=${encodeURIComponent(text.trim())}`)}
        className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-4 placeholder:text-text-muted"
      />
      {open && q.length >= 2 && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
          {s.length === 0 && st.length === 0 && <p className="px-3 py-4 text-sm text-text-muted">{t('common.empty')}</p>}
          {s.map((x) => (
            <button key={x.id} onClick={() => go(`/students/${x.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-muted">
              <GraduationCap className="h-4 w-4 text-text-muted" />
              <span className="flex-1 truncate">{x.fullName}</span>
              <span className="text-xs text-text-muted">{x.className}</span>
            </button>
          ))}
          {st.map((x) => (
            <button key={x.id} onClick={() => go(`/staff/${x.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-muted">
              <Users className="h-4 w-4 text-text-muted" />
              <span className="flex-1 truncate">{x.fullName}</span>
              <span className="text-xs text-text-muted">{x.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
