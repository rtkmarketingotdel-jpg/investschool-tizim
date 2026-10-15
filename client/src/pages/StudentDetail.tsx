import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileSignature, Pencil, Printer, Trash2, UserX, Wallet } from 'lucide-react';
import { useAuth, isManagement } from '@/context/AuthContext';
import { schoolApi } from '@/lib/schoolApi';
import { financeApi, openPdf } from '@/lib/financeApi';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { PaymentDrawer } from '@/components/finance/PaymentDrawer';
import { ContractDrawer } from '@/components/finance/ContractDrawer';
import { ContractTable } from '@/components/finance/ContractTable';
import { DeleteStudentDialog } from '@/components/students/DeleteStudentDialog';
import { StudentBotCard } from '@/components/students/StudentBotCard';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@/components/ui';
import { statusTone } from './Students';

type Tab = 'info' | 'payments' | 'contracts';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = isManagement(user?.role);
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [contracting, setContracting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const seesFinance = user?.role !== 'TEACHER';
  const canContract = seesFinance;
  const { data: s, isLoading, isError } = useQuery({ queryKey: ['student', id], queryFn: () => schoolApi.student(id) });
  const finance = useQuery({ queryKey: ['student', id, 'finance'], queryFn: () => financeApi.studentFinance(id), enabled: seesFinance && tab === 'payments' });
  const contracts = useQuery({ queryKey: ['contracts', 'student', id], queryFn: () => financeApi.contracts({ studentId: id, page: 1, limit: 50 }), enabled: canContract && tab === 'contracts' });

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !s) return <EmptyState icon={UserX} title={t('errors.NOT_FOUND')} action={<Link to="/students" className="text-primary">{t('common.back')}</Link>} />;

  const rows: Array<[string, string]> = [
    [t('students.birthDate'), s.birthDate ? fmtDay(s.birthDate, i18n.language, 'd MMMM yyyy') : '—'],
    [t('students.gender'), t(s.gender === 'MALE' ? 'students.male' : 'students.female')],
    [t('students.phone'), s.phone],
    [t('students.phone2'), s.phone2 ?? '—'],
    [t('students.passport'), s.passport ?? '—'],
    [t('students.pinfl'), s.pinfl ?? '—'],
    [t('students.district'), s.district ?? '—'],
    [t('students.address'), s.address ?? '—'],
    [t('students.course'), s.courseName ?? '—'],
    [t('students.group'), s.groupName ?? '—'],
    [t('students.enrolledAt'), fmtDay(s.enrolledAt, i18n.language, 'd MMMM yyyy')],
    ...(s.externalId ? [[t('students.fromNazorat'), `${s.externalCourse ?? '—'} · ID ${s.externalId}`] as [string, string]] : []),
    ...(s.leftAt ? [[t('students.leftAt'), fmtDay(s.leftAt, i18n.language, 'd MMMM yyyy')] as [string, string]] : []),
    ...(seesFinance
      ? [
          [t('students.coursePrice'), formatMoney(s.coursePrice, t('common.currency'))] as [string, string],
          [t('students.discount'), `${s.discountPercent}%`] as [string, string],
        ]
      : []),
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
            <h1 className="text-2xl font-medium">{s.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge>
              {s.groupName && <Badge>{s.groupName}</Badge>}
              {s.courseName && <span className="text-sm text-text-muted">{s.courseName}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> {t('students.edit')}
            </Button>
          )}
          {seesFinance && (
            <Button variant="secondary" onClick={() => setPaying(true)}>
              <Wallet className="h-4 w-4" /> {t('finance.payments.receive')}
            </Button>
          )}
          {canEdit && (
            <Button variant="ghost" aria-label={t('students.delete')} title={t('students.delete')} onClick={() => setDeleting(true)} className="px-3 text-danger">
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          {canContract && (
            <Button onClick={() => setContracting(true)}>
              <FileSignature className="h-4 w-4" /> {t('finance.contracts.create')}
            </Button>
          )}
        </div>
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
        <div className="space-y-4">
        {canEdit && <StudentBotCard student={s} />}
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
        </div>
      ) : tab === 'payments' ? (
        !seesFinance ? (
          <EmptyState icon={Wallet} title={t('errors.FORBIDDEN')} />
        ) : finance.isLoading ? (
          <Skeleton className="h-48" />
        ) : finance.data ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <p className="text-sm text-text-muted">{t('students.billed')}</p>
                <p className="mt-1 text-xl font-medium tabular-nums">{formatMoney(finance.data.billed, t('common.currency'))}</p>
              </Card>
              <Card>
                <p className="text-sm text-text-muted">{t('students.paid')}</p>
                <p className="mt-1 text-xl font-medium tabular-nums text-success">{formatMoney(finance.data.paid, t('common.currency'))}</p>
                {finance.data.billed > 0 && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.round((finance.data.paid / finance.data.billed) * 100))}%` }} />
                  </div>
                )}
              </Card>
              <Card>
                <p className="text-sm text-text-muted">{finance.data.debt > 0 ? t('students.debt') : t('students.balance')}</p>
                <p className={finance.data.debt > 0 ? 'mt-1 text-xl font-medium tabular-nums text-danger' : 'mt-1 text-xl font-medium tabular-nums text-success'}>
                  {finance.data.debt > 0 ? formatMoney(finance.data.debt, t('common.currency')) : formatMoney(-finance.data.balance, t('common.currency'))}
                </p>
                {finance.data.debt > 0 && finance.data.dueDate && (
                  <p className={finance.data.overdueDays > 0 ? 'mt-1 text-sm text-danger' : 'mt-1 text-sm text-text-muted'}>
                    {finance.data.overdueDays > 0
                      ? t('finance.debtors.overdue', { count: finance.data.overdueDays })
                      : t('students.dueBy', { date: fmtDay(finance.data.dueDate, i18n.language, 'd MMM yyyy') })}
                  </p>
                )}
              </Card>
            </div>
            {finance.data.timeline.length === 0 ? (
              <EmptyState icon={Wallet} title={t('common.empty')} />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {finance.data.timeline.map((e) => (
                    <li key={`${e.kind}${e.id}`} className="flex items-center gap-4 px-6 py-4">
                      <span className="w-24 shrink-0 text-sm text-text-muted">{fmtDay(e.date, i18n.language, 'd MMM yyyy')}</span>
                      <span className="flex-1">
                        {e.kind === 'CHARGE'
                          ? t('students.chargeCourse', { date: e.dueDate ? fmtDay(e.dueDate, i18n.language, 'd MMM yyyy') : '—' })
                          : `${t('finance.payments.title')}${e.method ? ` · ${t(`finance.methods.${e.method}`)}` : ''}`}
                      </span>
                      <span className={e.kind === 'PAYMENT' ? 'font-medium tabular-nums text-success' : 'font-medium tabular-nums'}>
                        {e.kind === 'PAYMENT' ? '+' : '−'}{formatMoney(e.amount, t('common.currency'))}
                      </span>
                      {e.kind === 'PAYMENT' && (
                        <button aria-label={t('finance.payments.receipt')} onClick={() => void openPdf(`/payments/${e.id}/receipt?lang=${i18n.language}`)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted">
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : null
      ) : !canContract ? (
        <EmptyState icon={FileSignature} title={t('errors.FORBIDDEN')} />
      ) : contracts.isLoading ? (
        <Skeleton className="h-40" />
      ) : contracts.data && contracts.data.items.length > 0 ? (
        <ContractTable rows={contracts.data.items} />
      ) : (
        <EmptyState icon={FileSignature} title={t('finance.contracts.empty')} />
      )}

      <StudentDrawer open={editing} student={s} onClose={() => setEditing(false)} />
      <PaymentDrawer open={paying} onClose={() => setPaying(false)} student={{ id: s.id, fullName: s.fullName, groupName: s.groupName, debt: s.debt ?? 0 }} />
      <DeleteStudentDialog student={deleting ? { id: s.id, fullName: s.fullName } : null} onClose={() => setDeleting(false)} onDeleted={() => navigate('/students', { replace: true })} />
      <ContractDrawer open={contracting} onClose={() => setContracting(false)} student={{ id: s.id, fullName: s.fullName }} />
    </div>
  );
}
