import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, FileText, ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode, uploadUrl } from '@/lib/api';
import { profileApi, type DocumentKind, type ProfileData } from '@/lib/profileApi';
import { readAsDataUrl, resizeImage } from '@/lib/image';
import { Avatar, Button, Card, Input, Select, Skeleton, useToast } from '../ui';

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: profileApi.get });

function useProfileMutation<T>(fn: (v: T) => Promise<ProfileData>, okKey?: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['profile'], data);
      void refresh();
      void qc.invalidateQueries({ queryKey: ['staff'] });
      if (okKey) toast(t(okKey));
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
}

/** 1) Profile photo: choose from the gallery or take one with the camera. */
export function PhotoSection() {
  const { t } = useTranslation();
  const { data } = useProfile();
  const pick = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const upload = useProfileMutation((file: File) => resizeImage(file, 640, 0.85).then(profileApi.uploadPhoto), 'profile.photoSaved');
  const onFile = (f: File | undefined, input: HTMLInputElement | null) => {
    if (f) upload.mutate(f);
    if (input) input.value = '';
  };
  return (
    <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <Avatar name={data?.user.fullName ?? '?'} size={112} src={data?.user.photoUrl} />
      <div className="space-y-3">
        <p className="text-text-muted">{t('profile.photoHint')}</p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input ref={pick} type="file" accept="image/*" className="hidden" aria-label={t('profile.choosePhoto')} onChange={(e) => onFile(e.target.files?.[0], e.target)} />
          <input ref={cam} type="file" accept="image/*" capture="user" className="hidden" aria-label={t('profile.takePhoto')} onChange={(e) => onFile(e.target.files?.[0], e.target)} />
          <Button type="button" variant="secondary" loading={upload.isPending} onClick={() => pick.current?.click()}><ImagePlus className="h-5 w-5" /> {t('profile.choosePhoto')}</Button>
          <Button type="button" variant="secondary" disabled={upload.isPending} onClick={() => cam.current?.click()}><Camera className="h-5 w-5" /> {t('profile.takePhoto')}</Button>
        </div>
      </div>
    </Card>
  );
}

interface Row {
  key: number;
  title: string;
  year: string;
  description: string;
}

/** 2) Achievements: a free list (title, year, description), saved as a whole. */
export function AchievementsSection({ saveLabel, onSaved }: { saveLabel?: string; onSaved?: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const next = useRef(1);
  const loaded = useRef(false);
  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    setRows(data.achievements.map((a) => ({ key: next.current++, title: a.title, year: a.year ? String(a.year) : '', description: a.description })));
  }, [data]);

  const save = useProfileMutation(
    () => profileApi.saveAchievements(rows.filter((r) => r.title.trim()).map((r) => ({ title: r.title.trim(), year: r.year ? Number(r.year) : null, description: r.description.trim() }))),
    'profile.saved',
  );
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const invalid = rows.some((r) => r.title.trim() && r.year && (Number(r.year) < 1950 || Number(r.year) > 2100));

  if (isLoading) return <Skeleton className="h-40" />;
  return (
    <Card className="space-y-4">
      <p className="text-text-muted">{t('profile.achievementsHint')}</p>
      {rows.map((r) => (
        <div key={r.key} className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Input aria-label={t('profile.achievementTitle')} placeholder={t('profile.achievementTitle')} value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} />
            <Input aria-label={t('profile.year')} placeholder={t('profile.year')} inputMode="numeric" value={r.year} onChange={(e) => update(r.key, { year: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          </div>
          <div className="flex gap-2">
            <Input aria-label={t('profile.description')} placeholder={t('profile.description')} value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} />
            <button type="button" aria-label={t('common.delete')} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="shrink-0 rounded-xl border border-border px-3 text-red-600 hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => setRows((rs) => [...rs, { key: next.current++, title: '', year: '', description: '' }])}><Plus className="h-5 w-5" /> {t('profile.addAchievement')}</Button>
        <Button type="button" disabled={invalid} loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => onSaved?.() })}>{saveLabel ?? t('common.save')}</Button>
      </div>
    </Card>
  );
}

const MAX_PDF = 5 * 1024 * 1024;

/** 3) Certificates and diplomas: a photo or a PDF per entry. */
export function DocumentsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isLoading } = useProfile();
  const [kind, setKind] = useState<DocumentKind>('CERTIFICATE');
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const add = useProfileMutation(async () => {
    if (!file) throw new Error('no file');
    const dataUrl = file.type === 'application/pdf' ? await readAsDataUrl(file) : await resizeImage(file, 1600, 0.85);
    return profileApi.addDocument({ kind, title: title.trim(), issuer: issuer.trim() || null, year: year ? Number(year) : null, file: dataUrl });
  }, 'profile.documentAdded');
  const remove = useProfileMutation((id: string) => profileApi.removeDocument(id));

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.type.startsWith('image/')) return void toast(t('errors.FILE_INVALID_TYPE'), 'error');
    if (f.type === 'application/pdf' && f.size > MAX_PDF) return void toast(t('errors.FILE_TOO_LARGE'), 'error');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };
  const submit = () => add.mutate(undefined, { onSuccess: () => { setTitle(''); setIssuer(''); setYear(''); setFile(null); } });
  const valid = !!file && title.trim().length >= 2 && (!year || (Number(year) >= 1950 && Number(year) <= 2100));

  if (isLoading) return <Skeleton className="h-40" />;
  return (
    <Card className="space-y-5">
      <p className="text-text-muted">{t('profile.documentsHint')}</p>
      {data && data.documents.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              {d.mime.startsWith('image/') ? (
                <img src={uploadUrl(d.fileUrl) ?? ''} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileText className="h-6 w-6" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{d.title}</p>
                <p className="truncate text-xs text-text-muted">{t(`profile.kinds.${d.kind}`)}{d.issuer ? ` · ${d.issuer}` : ''}{d.year ? ` · ${d.year}` : ''}</p>
                <a href={uploadUrl(d.fileUrl) ?? '#'} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{t('profile.view')}</a>
              </div>
              <button type="button" aria-label={t('common.delete')} onClick={() => window.confirm(t('profile.deleteDocConfirm', { title: d.title })) && remove.mutate(d.id)} className="rounded-lg p-2 text-red-600 hover:bg-surface-muted"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select aria-label={t('profile.kind')} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {(['CERTIFICATE', 'DIPLOMA', 'OTHER'] as const).map((k) => <option key={k} value={k}>{t(`profile.kinds.${k}`)}</option>)}
          </Select>
          <Input aria-label={t('profile.docTitle')} placeholder={t('profile.docTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input aria-label={t('profile.issuer')} placeholder={t('profile.issuer')} value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          <Input aria-label={t('profile.year')} placeholder={t('profile.year')} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" aria-label={t('profile.chooseFile')} onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}><Upload className="h-5 w-5" /> {t('profile.chooseFile')}</Button>
          <span className="text-sm text-text-muted">{file ? file.name : t('profile.fileHint')}</span>
        </div>
        <Button type="button" disabled={!valid} loading={add.isPending} onClick={submit}><Plus className="h-5 w-5" /> {t('profile.addDocument')}</Button>
      </div>
    </Card>
  );
}
