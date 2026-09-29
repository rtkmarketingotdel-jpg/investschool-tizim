import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, UserX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schoolApi } from '@/lib/schoolApi';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@/components/ui';
import { statusTone } from './Students';

type Tab = 'info' | 'payments' | 'contracts';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const { data: s, isLoading, isError } = useQuery({ queryKey: ['student', id], queryFn: () => schoolApi.student(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !s) return <EmptyState icon={UserX} title={t('errors.NOT_FOUND')} action={<Link to="/students" className="text-primary">{t('common.back')}</Link>} />;

  const rows: Array<[string, string]> = [
    [t('students.birthDate'), s.birthDate ? fmtDay(s.birthDate, i18n.language, 'd MMMM yyyy') : '—'],
    [t('students.gender'), t(s.gender === 'MALE' ? 'students.male' : 'students.female')],
    [t('students.parentName'), s.parentName],
    [t('students.parentPhone'), s.parentPhone],
    [t('students.parentPhone2'), s.parentPhone2 ?? '—'],
    [t('students.district'), s.district ?? '—'],
    [t('students.address'), s.address ?? '—'],
    [t('students.boarding'), t(s.isBoarding ? 'common.yes' : 'common.no')],
    [t('students.clubs'), s.clubs.length ? s.clubs.join(', ') : '—'],
    [t('students.monthlyFee'), formatMoney(s.monthlyFee, t('common.currency'))],
    [t('students.discount'), `${s.discountPercent}%`],
    [t('students.enrolledAt'), fmtDay(s.enrolledAt, i18n.language, 'd MMMM yyyy')],
    [t('students.notes'), s.notes ?? '—'],
  ];

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-2 text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> {t('nav.studentsList')}
      </Link>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={`${s.firstName} ${s.lastName}`} size={72} />
          <div>
            <h1 className="text-2xl font-semibold">{s.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge>
              {s.className && <Badge>{s.className}</Badge>}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {t('students.edit')}
          </Button>
        )}
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'info', label: t('students.tabs.info') },
          { id: 'payments', label: t('students.tabs.payments') },
          { id: 'contracts', label: t('students.tabs.contracts') },
        ]}
      />
      {tab === 'info' ? (
        <Card>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-text-muted">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <EmptyState icon={UserX} title={t('placeholder.title')} text={t('placeholder.text')} />
      )}

      <StudentDrawer open={editing} student={s} onClose={() => setEditing(false)} />
    </div>
  );
}
