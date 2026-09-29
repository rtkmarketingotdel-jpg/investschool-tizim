import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GraduationCap, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { schoolApi, type Club, type Subject } from '@/lib/schoolApi';
import { Avatar, Badge, Button, Drawer, EmptyState, Skeleton } from '../ui';
import { clubIcon, subjectIcon, tintFor } from './parts';

function Header({ icon: Icon, name, sub }: { icon: typeof Users; name: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border p-5">
      <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', tintFor(name))}><Icon className="h-7 w-7" /></span>
      <div className="min-w-0"><p className="truncate text-xl">{name}</p><p className="text-sm text-text-muted">{sub}</p></div>
    </div>
  );
}

/** Who teaches this subject (teachers and tutors), each opening the employee's page. */
export function SubjectDrawer({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Drawer open={!!subject} onClose={onClose} title={subject?.name ?? ''} width={520}>
      {subject && (
        <div className="space-y-5">
          <Header icon={subjectIcon(subject.name)} name={subject.name} sub={t('academics.whoTeaches')} />
          {subject.people.length === 0 ? (
            <EmptyState icon={GraduationCap} title={t('academics.noTeacher')} text={t('academics.noTeacherHint')} action={<Link to="/staff?add=teacher"><Button><UserPlus className="h-5 w-5" /> {t('staff.addTeacher')}</Button></Link>} />
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {subject.people.map((p) => (
                <li key={p.id}>
                  <Link to={`/staff/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted">
                    <Avatar name={p.fullName} size={44} src={p.photoUrl} />
                    <div className="min-w-0 flex-1"><p className="truncate">{p.fullName}</p><p className="truncate text-xs text-text-muted">{p.position}</p></div>
                    <Badge tone={p.kind === 'tutor' ? 'warning' : 'success'}>{t(`staff.kind.${p.kind}`)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** Students who joined the club. */
export function ClubDrawer({ club, onClose }: { club: Club | null; onClose: () => void }) {
  const { t } = useTranslation();
  const list = useQuery({
    queryKey: ['students', 'club', club?.name],
    queryFn: () => schoolApi.students({ club: club!.name, page: 1, limit: 100, sort: 'name' }),
    enabled: !!club,
  });
  const items = (list.data?.items ?? []).filter((s) => s.status !== 'LEFT');
  return (
    <Drawer open={!!club} onClose={onClose} title={club?.name ?? ''} width={520}>
      {club && (
        <div className="space-y-5">
          <Header icon={clubIcon(club.name)} name={club.name} sub={club.teacherName ? `${t('academics.leader')}: ${club.teacherName}` : t('academics.noLeader')} />
          <h3 className="text-lg">{t('academics.clubMembers')} <span className="text-text-muted">({items.length})</span></h3>
          {list.isLoading ? <Skeleton className="h-48" /> : items.length === 0 ? (
            <EmptyState icon={Users} title={t('academics.noMembers')} text={t('academics.noMembersHint')} />
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {items.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/students/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted">
                    <span className="w-6 text-sm text-text-muted tabular-nums">{i + 1}</span>
                    <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{s.fullName}</p><p className="text-xs text-text-muted">{s.className ?? '—'}</p></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}
