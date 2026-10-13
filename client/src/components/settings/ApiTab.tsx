import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound, Link2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { fmtDay } from '@/lib/dates';
import { integrationApi, integrationBaseUrl } from '@/lib/integrationApi';
import { schoolApi } from '@/lib/schoolApi';
import { Badge, Button, Card, Input, Modal, Select, Skeleton, Table, Td, Th, Thead, Tr, useToast } from '../ui';

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    },
  };
}

const EXAMPLE = `{
  "externalId": "naz-1024",
  "firstName": "Jasur",
  "lastName": "Olimov",
  "phone": "+998901234567",
  "course": "Samarqand santexnika",
  "birthDate": "2001-05-14",
  "gender": "MALE",
  "passport": "AB1234567"
}`;

/** Settings → API: keys for other systems, Nazorat AI course labels linked to groups, and a short reference. */
export function ApiTab() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { copied, copy } = useCopy();
  const keys = useQuery({ queryKey: ['integration', 'keys'], queryFn: integrationApi.keys });
  const links = useQuery({ queryKey: ['integration', 'links'], queryFn: integrationApi.links });
  const groups = useQuery({ queryKey: ['groups'], queryFn: schoolApi.groups });
  const [keyName, setKeyName] = useState('Nazorat AI');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [labelGroup, setLabelGroup] = useState('');

  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const refreshLinks = () => {
    for (const k of [['integration', 'links'], ['groups'], ['students']]) void qc.invalidateQueries({ queryKey: k });
  };
  const placedToast = (r: { placed: number }) => toast(r.placed ? t('api.links.placed', { count: r.placed }) : t('settings.saved'));

  const createKey = useMutation({
    mutationFn: () => integrationApi.createKey(keyName.trim()),
    onSuccess: (r) => { setNewKey(r.key); void qc.invalidateQueries({ queryKey: ['integration', 'keys'] }); },
    onError: fail,
  });
  const deleteKey = useMutation({ mutationFn: integrationApi.deleteKey, onSuccess: () => void qc.invalidateQueries({ queryKey: ['integration', 'keys'] }), onError: fail });
  const addLink = useMutation({
    mutationFn: () => integrationApi.addLink(label.trim(), labelGroup || null),
    onSuccess: (r) => { setLabel(''); setLabelGroup(''); placedToast(r); refreshLinks(); },
    onError: fail,
  });
  const setLink = useMutation({ mutationFn: (v: { id: string; groupId: string }) => integrationApi.setLink(v.id, v.groupId || null), onSuccess: (r) => { placedToast(r); refreshLinks(); }, onError: fail });
  const deleteLink = useMutation({ mutationFn: integrationApi.deleteLink, onSuccess: refreshLinks, onError: fail });

  const base = integrationBaseUrl();
  // finished groups take no one: offer running/upcoming ones (plus whatever a label already points to)
  const groupOptions = (current: string | null) => (groups.data ?? []).filter((g) => g.status !== 'FINISHED' || g.id === current);
  const day = (iso: string | null) => (iso ? fmtDay(iso.slice(0, 10), i18n.language, 'd MMM yyyy') : '—');
  const endpoints: Array<[string, string]> = [
    ['POST /students', t('api.docs.postStudents')],
    ['GET /students', t('api.docs.getStudents')],
    ['GET /students/:id', t('api.docs.getStudent')],
    ['GET /courses', t('api.docs.getCourses')],
    ['GET /groups', t('api.docs.getGroups')],
    ['GET /payments', t('api.docs.getPayments')],
    ['GET /debtors', t('api.docs.getDebtors')],
    ['GET /staff', t('api.docs.getStaff')],
    ['GET /attendance', t('api.docs.getAttendance')],
  ];
  const curl = `curl -X POST ${base}/students \\\n  -H "X-API-Key: rtk_…" \\\n  -H "Content-Type: application/json" \\\n  -d '${EXAMPLE.replace(/\n\s*/g, ' ')}'`;

  return (
    <div className="max-w-5xl space-y-6">
      {/* keys */}
      <Card className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-text-muted" /> {t('api.keys.title')}</h3>
          <p className="text-sm text-text-muted">{t('api.keys.hint')}</p>
        </div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (keyName.trim().length >= 2) createKey.mutate(); }}>
          <div className="min-w-56 flex-1"><Input label={t('api.keys.name')} value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={60} /></div>
          <Button type="submit" loading={createKey.isPending} disabled={keyName.trim().length < 2}><Plus className="h-4 w-4" /> {t('api.keys.create')}</Button>
        </form>
        {keys.isLoading ? <Skeleton className="h-20" /> : (keys.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">{t('api.keys.empty')}</p>
        ) : (
          <Table>
            <Thead><tr><Th>{t('api.keys.name')}</Th><Th>{t('api.keys.key')}</Th><Th>{t('api.keys.created')}</Th><Th>{t('api.keys.lastUsed')}</Th><Th className="w-12"><span className="sr-only">{t('common.delete')}</span></Th></tr></Thead>
            <tbody>
              {keys.data!.map((k) => (
                <Tr key={k.id}>
                  <Td>{k.name}</Td>
                  <Td className="font-mono text-sm text-text-muted">{k.prefix}…</Td>
                  <Td className="text-sm text-text-muted">{day(k.createdAt)}</Td>
                  <Td className="text-sm text-text-muted">{day(k.lastUsedAt)}</Td>
                  <Td>
                    <button aria-label={t('common.delete')} title={t('common.delete')} onClick={() => window.confirm(t('api.keys.deleteConfirm', { name: k.name })) && deleteKey.mutate(k.id)} className="rounded-lg p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* course labels → groups */}
      <Card className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg"><Link2 className="h-5 w-5 text-text-muted" /> {t('api.links.title')}</h3>
          <p className="text-sm text-text-muted">{t('api.links.hint')}</p>
        </div>
        {links.isLoading ? <Skeleton className="h-24" /> : (
          <Table>
            <Thead><tr><Th>{t('api.links.label')}</Th><Th>{t('api.links.group')}</Th><Th>{t('api.links.waiting')}</Th><Th className="w-12"><span className="sr-only">{t('common.delete')}</span></Th></tr></Thead>
            <tbody>
              {(links.data ?? []).map((l) => (
                <Tr key={l.id}>
                  <Td>
                    {l.label}
                    {!l.groupId && <p className="flex items-center gap-1 text-[13px] text-warning"><TriangleAlert className="h-3.5 w-3.5" /> {t('api.links.unlinked')}</p>}
                  </Td>
                  <Td className="min-w-56">
                    <Select aria-label={t('api.links.group')} value={l.groupId ?? ''} onChange={(e) => setLink.mutate({ id: l.id, groupId: e.target.value })}>
                      <option value="">{t('api.links.noGroup')}</option>
                      {groupOptions(l.groupId).map((g) => <option key={g.id} value={g.id}>{g.name} · {g.courseName} · {t(`groups.statuses.${g.status}`)}</option>)}
                    </Select>
                  </Td>
                  <Td>{l.waiting ? <Badge tone="warning">{l.waiting}</Badge> : <span className="text-text-muted">—</span>}</Td>
                  <Td>
                    <button aria-label={t('common.delete')} title={t('common.delete')} onClick={() => window.confirm(t('api.links.deleteConfirm', { label: l.label })) && deleteLink.mutate(l.id)} className="rounded-lg p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
                  </Td>
                </Tr>
              ))}
              <Tr>
                <Td><Input aria-label={t('api.links.label')} placeholder={t('api.links.labelPlaceholder')} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} /></Td>
                <Td>
                  <Select aria-label={t('api.links.group')} value={labelGroup} onChange={(e) => setLabelGroup(e.target.value)}>
                    <option value="">{t('api.links.noGroup')}</option>
                    {groupOptions(null).map((g) => <option key={g.id} value={g.id}>{g.name} · {g.courseName} · {t(`groups.statuses.${g.status}`)}</option>)}
                  </Select>
                </Td>
                <Td colSpan={2}><Button className="px-4 py-2.5 text-sm" loading={addLink.isPending} disabled={label.trim().length < 2} onClick={() => addLink.mutate()}><Plus className="h-4 w-4" /> {t('api.links.add')}</Button></Td>
              </Tr>
            </tbody>
          </Table>
        )}
      </Card>

      {/* reference */}
      <Card className="space-y-4">
        <h3 className="text-lg">{t('api.docs.title')}</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-text-muted">{t('api.docs.baseUrl')}</dt>
          <dd className="flex items-center gap-2 font-mono break-all">{base}
            <button aria-label={t('common.copy')} onClick={() => void copy('base', base)} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted">{copied === 'base' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
          </dd>
          <dt className="text-text-muted">{t('api.docs.auth')}</dt>
          <dd className="font-mono">X-API-Key: rtk_…</dd>
        </dl>
        <ul className="divide-y divide-border rounded-xl border border-border text-sm">
          {endpoints.map(([path, text]) => (
            <li key={path} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5"><span className="w-40 shrink-0 font-mono">{path}</span><span className="text-text-muted">{text}</span></li>
          ))}
        </ul>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm">{t('api.docs.example')}</span>
            <button onClick={() => void copy('curl', curl)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-surface-muted">{copied === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} curl</button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-surface-muted p-4 text-[13px] leading-relaxed">{EXAMPLE}</pre>
        </div>
        <p className="text-sm text-text-muted">{t('api.docs.placement')}</p>
      </Card>

      <Modal open={!!newKey} onClose={() => setNewKey(null)} title={t('api.keys.createdTitle')}>
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t('api.keys.onceWarning')}</p>
          <p className="break-all rounded-xl border border-border bg-surface-muted p-3 font-mono text-sm">{newKey}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setNewKey(null)}>{t('common.close')}</Button>
            <Button className="flex-1" onClick={() => newKey && void copy('key', newKey)}>{copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t('common.copy')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
