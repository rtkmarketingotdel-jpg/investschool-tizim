import { api } from './api';

export interface Achievement {
  id: string;
  title: string;
  year: number | null;
  description: string;
}
export type DocumentKind = 'CERTIFICATE' | 'DIPLOMA' | 'OTHER';
export interface StaffDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  issuer: string | null;
  year: number | null;
  fileUrl: string;
  mime: string;
}
export interface ProfileData {
  user: { id: string; fullName: string; phone: string; position: string; photoUrl: string | null; profileCompletedAt: string | null };
  achievements: Achievement[];
  documents: StaffDocument[];
}

export const profileApi = {
  get: () => api.get<ProfileData>('/profile').then((r) => r.data),
  uploadPhoto: (image: string) => api.post<ProfileData>('/profile/photo', { image }).then((r) => r.data),
  saveAchievements: (items: Array<Pick<Achievement, 'title' | 'year' | 'description'>>) => api.put<ProfileData>('/profile/achievements', { items }).then((r) => r.data),
  addDocument: (d: { kind: DocumentKind; title: string; issuer: string | null; year: number | null; file: string }) => api.post<ProfileData>('/profile/documents', d).then((r) => r.data),
  removeDocument: (id: string) => api.delete<ProfileData>(`/profile/documents/${id}`).then((r) => r.data),
  complete: () => api.post<ProfileData>('/profile/complete').then((r) => r.data),
};
