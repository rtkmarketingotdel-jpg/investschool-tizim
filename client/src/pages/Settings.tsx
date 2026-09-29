import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { financeApi } from '@/lib/financeApi';
import { PageHeader } from '@/components/PageHeader';
import { InterfaceTab } from '@/components/settings/InterfaceTab';
import { LocationTab } from '@/components/settings/LocationTab';
import { PaymentsTab } from '@/components/settings/PaymentsTab';
import { TelegramTab } from '@/components/settings/TelegramTab';
import { TemplatesTab } from '@/components/settings/TemplatesTab';
import { UsersTab } from '@/components/settings/UsersTab';
import { WorkTab } from '@/components/settings/WorkTab';
import { EmptyState, Skeleton, Tabs } from '@/components/ui';
import { Settings as SettingsIcon } from 'lucide-react';

type Tab = 'location' | 'work' | 'payments' | 'users' | 'templates' | 'telegram' | 'interface';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const tabs: Tab[] = isDirector ? ['location', 'work', 'payments', 'users', 'templates', 'telegram', 'interface'] : ['location', 'templates', 'interface'];
  const [tab, setTab] = useState<Tab>('location');
  const { data, isLoading, isError } = useQuery({ queryKey: ['settings'], queryFn: financeApi.settings });

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      <Tabs value={tab} onChange={setTab} tabs={tabs.map((id) => ({ id, label: t(`settings.tabs.${id}`) }))} />
      {isLoading ? <Skeleton className="h-72" /> : isError || !data ? (
        <EmptyState icon={SettingsIcon} title={t('errors.INTERNAL_ERROR')} />
      ) : (
        <>
          {tab === 'location' && <LocationTab settings={data} />}
          {tab === 'work' && <WorkTab settings={data} />}
          {tab === 'payments' && <PaymentsTab settings={data} />}
          {tab === 'users' && <UsersTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'telegram' && <TelegramTab settings={data} />}
          {tab === 'interface' && <InterfaceTab />}
        </>
      )}
    </div>
  );
}
