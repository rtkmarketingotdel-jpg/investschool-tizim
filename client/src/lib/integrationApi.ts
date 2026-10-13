import { api } from './api';

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}
export interface CourseLinkRow {
  id: string;
  label: string;
  groupId: string | null;
  /** trainees who arrived with this label and still have no group */
  waiting: number;
}
type Placed = { waiting: number; placed: number };

export const integrationApi = {
  keys: () => api.get<{ items: ApiKeyRow[] }>('/integration/keys').then((r) => r.data.items),
  createKey: (name: string) => api.post<ApiKeyRow & { key: string }>('/integration/keys', { name }).then((r) => r.data),
  deleteKey: (id: string) => api.delete(`/integration/keys/${id}`).then((r) => r.data),
  links: () => api.get<{ items: CourseLinkRow[] }>('/integration/links').then((r) => r.data.items),
  addLink: (label: string, groupId: string | null) => api.post<Placed>('/integration/links', { label, groupId }).then((r) => r.data),
  setLink: (id: string, groupId: string | null) => api.put<Placed>(`/integration/links/${id}`, { groupId }).then((r) => r.data),
  deleteLink: (id: string) => api.delete(`/integration/links/${id}`).then((r) => r.data),
};

/** Public base of the integration API as other systems must call it. */
export const integrationBaseUrl = () => {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? `${window.location.origin}/api`;
  return `${base.replace(/\/$/, '')}/v1`;
};
