import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { AchievementsSection, DocumentsSection, PhotoSection } from '@/components/profile/ProfileSections';

export default function Profile() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <section className="space-y-3"><h2 className="text-lg">{t('profile.steps.photo')}</h2><PhotoSection /></section>
      <section className="space-y-3"><h2 className="text-lg">{t('profile.steps.achievements')}</h2><AchievementsSection /></section>
      <section className="space-y-3"><h2 className="text-lg">{t('profile.steps.documents')}</h2><DocumentsSection /></section>
    </div>
  );
}
