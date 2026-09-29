import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { AutoTab } from '@/components/sms/AutoTab';
import { ComposeTab } from '@/components/sms/ComposeTab';
import { HistoryTab } from '@/components/sms/HistoryTab';
import { StatusBanner } from '@/components/sms/StatusBanner';
import { TemplatesTab } from '@/components/sms/TemplatesTab';
import { Tabs } from '@/components/ui';

type Tab = 'compose' | 'history' | 'templates' | 'auto';

export default function Sms() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('compose');
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.sms')} subtitle={t('sms.subtitle')} />
      <StatusBanner />
      <Tabs value={tab} onChange={setTab} tabs={(['compose', 'history', 'templates', 'auto'] as Tab[]).map((id) => ({ id, label: t(`sms.tabs.${id}`) }))} />
      {tab === 'compose' && <ComposeTab onSent={(id) => { setTab('history'); setOpenId(id); }} />}
      {tab === 'history' && <HistoryTab openId={openId} onOpen={setOpenId} />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'auto' && <AutoTab />}
    </div>
  );
}
