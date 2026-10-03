import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileSignature, Pencil, Printer, UserX, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schoolApi } from '@/lib/schoolApi';
import { financeApi, openPdf } from '@/lib/financeApi';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { PaymentDrawer } from '@/components/finance/PaymentDrawer';
import { ContractDrawer } from '@/components/finance/ContractDrawer';
import { ContractTable } from '@/components/finance/ContractTable';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@/components/ui';
import { statusTone } from './Students';

type Tab = 'info' | 'payments' | 'contracts';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role !== 'TEACHER';
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [contracting, setContracting] = useState(false);
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
            <h1 className="text-2xl font-medium">{s.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge>
              {s.className && <Badge>{s.className}</Badge>}
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
      ) : tab === 'payments' ? (
        !seesFinance ? (
          <EmptyState icon={Wallet} title={t('errors.FORBIDDEN')} />
        ) : finance.isLoading ? (
          <Skeleton className="h-48" />
        ) : finance.data ? (
          <div className="space-y-4">
            <Card className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-text-muted">{t('students.balance')}</span>
              <span className={finance.data.debt > 0 ? 'text-2xl font-medium tabular-nums text-danger' : 'text-2xl font-medium tabular-nums text-success'}>
                {finance.data.debt > 0 ? `−${formatMoney(finance.data.debt, t('common.currency'))}` : formatMoney(-finance.data.balance, t('common.currency'))}
              </span>
            </Card>
            {finance.data.timeline.length === 0 ? (
              <EmptyState icon={Wallet} title={t('common.empty')} />
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {finance.data.timeline.map((e) => (
                    <li key={`${e.kind}${e.id}`} className="flex items-center gap-4 px-6 py-4">
                      <span className="w-24 shrink-0 text-sm text-text-muted">{fmtDay(e.date, i18n.language, 'd MMM yyyy')}</span>
                      <span className="flex-1">
                        {e.kind === 'CHARGE' ? t('students.chargeFor', { period: e.period }) : `${t('finance.payments.title')}${e.method ? ` · ${t(`finance.methods.${e.method}`)}` : ''}`}
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
      <PaymentDrawer open={paying} onClose={() => setPaying(false)} student={{ id: s.id, fullName: s.fullName, className: s.className, debt: s.debt ?? 0 }} />
      <ContractDrawer open={contracting} onClose={() => setContracting(false)} student={{ id: s.id, fullName: s.fullName }} />
    </div>
  );
}
