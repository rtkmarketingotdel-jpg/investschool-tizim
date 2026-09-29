import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './ui';

export function PagePlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-[28px] font-medium">{t(titleKey)}</h1>
      <div className="mt-8">
        <EmptyState icon={Construction} title={t('placeholder.title')} text={t('placeholder.text')} />
      </div>
    </div>
  );
}
