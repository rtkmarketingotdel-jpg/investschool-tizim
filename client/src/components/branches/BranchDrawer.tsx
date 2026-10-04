import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LocateFixed } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { schoolApi, type Branch } from '@/lib/schoolApi';
import { Button, Drawer, Input, useToast } from '../ui';
import { LocationPicker } from '../maps/LocationPicker';

const num = (v: string) => (v.trim() === '' ? NaN : Number(v));

interface Props {
  open: boolean;
  branch: Branch | null; // null = create
  onClose: () => void;
}

export function BranchDrawer({ open, branch, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('39.6542');
  const [lng, setLng] = useState('66.9597');
  const [radius, setRadius] = useState('150');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const staff = useQuery({ queryKey: ['staff', 'branch-assign'], queryFn: () => schoolApi.staff({ active: 'true', page: 1, limit: 100 }), enabled: open });
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes, enabled: open });

  useEffect(() => {
    if (!open) return;
    setName(branch?.name ?? '');
    setAddress(branch?.address ?? '');
    setLat(String(branch?.lat ?? 39.6542));
    setLng(String(branch?.lng ?? 66.9597));
    setRadius(String(branch?.radiusM ?? 150));
  }, [open, branch]);
  useEffect(() => {
    if (!open) return;
    setUserIds(branch ? (staff.data?.items.filter((u) => u.branchId === branch.id).map((u) => u.id) ?? []) : []);
  }, [open, branch, staff.data]);
  useEffect(() => {
    if (!open) return;
    setClassIds(branch ? (classes.data?.filter((c) => c.branchId === branch.id).map((c) => c.id) ?? []) : []);
  }, [open, branch, classes.data]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), address: address.trim() || null, lat: Number(lat), lng: Number(lng), radiusM: Number(radius) };
      const saved = branch ? await schoolApi.updateBranch(branch.id, body) : await schoolApi.createBranch(body);
      await schoolApi.assignBranch(saved.id, userIds, classIds);
      return saved;
    },
    onSuccess: () => {
      toast(t('settings.branches.saved'));
      for (const k of ['branches', 'staff', 'classes', 'attendance']) void qc.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const locate = () => {
    if (!navigator.geolocation) return toast(t('errors.GEO_UNSUPPORTED'), 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setLocating(false); },
      (e) => { setLocating(false); toast(t(e.code === e.PERMISSION_DENIED ? 'errors.GEO_DENIED' : 'errors.GEO_FAILED'), 'error'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const valid = name.trim().length >= 2 && Math.abs(num(lat)) <= 90 && Math.abs(num(lng)) <= 180 && num(radius) >= 10 && num(radius) <= 5000;

  const check = (checked: boolean, label: string, sub: string | null, onChange: () => void, other?: string | null) => (
    <label key={label + sub} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-muted">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[rgb(var(--primary))]" />
      <span className="flex-1 text-sm">{label}{sub && <span className="text-text-muted"> · {sub}</span>}</span>
      {other && <span className="text-xs text-text-muted">{other}</span>}
    </label>
  );
  const branchName = (id: string | null) => (id && id !== branch?.id ? branchesLookup.get(id) ?? null : null);
  const all = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches, enabled: open });
  const branchesLookup = new Map((all.data ?? []).map((b) => [b.id, b.name]));

  return (
    <Drawer open={open} onClose={onClose} title={t(branch ? 'settings.branches.edit' : 'settings.branches.add')}>
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }}>
        <div className="space-y-4">
          <Input label={t('settings.branches.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('settings.branches.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input type="number" step="any" label={t('settings.branches.lat')} value={lat} onChange={(e) => setLat(e.target.value)} />
            <Input type="number" step="any" label={t('settings.branches.lng')} value={lng} onChange={(e) => setLng(e.target.value)} />
            <Input type="number" min={10} max={5000} label={t('settings.branches.radius')} value={radius} onChange={(e) => setRadius(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={locate} loading={locating}><LocateFixed className="h-5 w-5" /> {t('settings.branches.useMine')}</Button>
          <LocationPicker lat={num(lat)} lng={num(lng)} radiusM={num(radius)} onPick={(a, b) => { setLat(String(a)); setLng(String(b)); }} />
          <p className="text-xs text-text-muted">{t('settings.branches.pickHint')}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm uppercase tracking-wider text-text-muted">{t('settings.branches.employees')} ({userIds.length})</legend>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-1">
            {staff.data?.items.map((u) => check(userIds.includes(u.id), u.fullName, u.position, () => toggle(userIds, setUserIds, u.id), branchName(u.branchId)))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm uppercase tracking-wider text-text-muted">{t('settings.branches.classes')} ({classIds.length})</legend>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-border p-1">
            {classes.data?.map((c) => check(classIds.includes(c.id), c.name, null, () => toggle(classIds, setClassIds, c.id), branchName(c.branchId)))}
          </div>
          <p className="mt-1 text-xs text-text-muted">{t('settings.branches.assignHint')}</p>
        </fieldset>

        <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-border bg-surface px-6 py-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" className="flex-1" disabled={!valid} loading={save.isPending}>{t('common.save')}</Button>
        </div>
      </form>
    </Drawer>
  );
}
