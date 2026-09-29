import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { schoolApi, type Branch } from '@/lib/schoolApi';
import type { Settings } from '@/lib/financeApi';
import { BranchDrawer } from '../branches/BranchDrawer';
import { Button, Card, EmptyState, Input, Modal, Select, Skeleton, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { numOrNaN, useSaveSettings } from './shared';

function GeoRules({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const [acc, setAcc] = useState(String(settings.maxGpsAccuracyM));
  const [enforced, setEnforced] = useState(settings.geoEnforced);
  return (
    <Card className="space-y-4">
      <h3 className="text-lg">{t('settings.branches.rules')}</h3>
      <div>
        <Checkbox label={t('settings.branches.enforce')} checked={enforced} onChange={setEnforced} />
        <p className="ml-8 mt-1 text-sm text-text-muted">{t('settings.branches.enforceHint')}</p>
      </div>
      <div className="max-w-xs"><Input type="number" min={10} label={t('settings.branches.accuracy')} value={acc} onChange={(e) => setAcc(e.target.value)} /></div>
      <Button disabled={!(numOrNaN(acc) >= 10)} loading={save.isPending} onClick={() => save.mutate({ maxGpsAccuracyM: Number(acc), geoEnforced: enforced })}>{t('common.save')}</Button>
    </Card>
  );
}

export function BranchesTab({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });
  const [drawer, setDrawer] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });
  const [removing, setRemoving] = useState<Branch | null>(null);
  const [moveTo, setMoveTo] = useState('');

  const del = useMutation({
    mutationFn: (b: Branch) => schoolApi.deleteBranch(b.id, b.usage.users + b.usage.classes > 0 ? moveTo : undefined),
    onSuccess: () => {
      toast(t('settings.branches.deleted'));
      setRemoving(null);
      for (const k of ['branches', 'staff', 'classes', 'attendance']) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const branches = list.data ?? [];
  const others = removing ? branches.filter((b) => b.id !== removing.id) : [];
  const hasData = !!removing && removing.usage.users + removing.usage.classes > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-text-muted">{t('settings.branches.hint')}</p>
        <Button onClick={() => setDrawer({ open: true, branch: null })}><Plus className="h-5 w-5" /> {t('settings.branches.add')}</Button>
      </div>

      {list.isLoading ? <Skeleton className="h-40" /> : branches.length === 0 ? (
        <EmptyState icon={MapPin} title={t('settings.branches.empty')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-lg">{b.name}</h3>
                  <p className="truncate text-sm text-text-muted">{b.address ?? '—'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label={t('settings.branches.edit')} onClick={() => setDrawer({ open: true, branch: b })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={t('settings.branches.delete')} onClick={() => { setRemoving(b); setMoveTo(''); }} className="rounded-lg p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={`https://www.google.com/maps?q=${b.lat},${b.lng}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {b.lat.toFixed(5)}, {b.lng.toFixed(5)}
              </a>
              <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
                <div><dt className="text-text-muted">{t('settings.branches.radius')}</dt><dd className="tabular-nums">{b.radiusM} m</dd></div>
                <div><dt className="text-text-muted">{t('settings.branches.employees')}</dt><dd className="tabular-nums">{b.usage.users}</dd></div>
                <div><dt className="text-text-muted">{t('settings.branches.classes')}</dt><dd className="tabular-nums">{b.usage.classes}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}

      <GeoRules settings={settings} />
      <BranchDrawer open={drawer.open} branch={drawer.branch} onClose={() => setDrawer((d) => ({ ...d, open: false }))} />

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={t('settings.branches.delete')}>
        {removing && (
          <div className="space-y-4">
            {branches.length <= 1 ? (
              <p role="alert" className="text-danger">{t('errors.BRANCH_LAST')}</p>
            ) : (
              <>
                <p className="text-text-muted">{t('settings.branches.deleteConfirm', { name: removing.name })}</p>
                {hasData && (
                  <>
                    <p className="text-sm">{t('settings.branches.hasData', removing.usage)}</p>
                    <Select label={t('settings.branches.moveTo')} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">—</option>
                      {others.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      <option value="none">{t('settings.branches.detach')}</option>
                    </Select>
                  </>
                )}
              </>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setRemoving(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" className="flex-1" loading={del.isPending} disabled={branches.length <= 1 || (hasData && !moveTo)} onClick={() => del.mutate(removing)}>{t('settings.branches.delete')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

