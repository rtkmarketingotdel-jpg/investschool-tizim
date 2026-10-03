import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, LogOut } from 'lucide-react';
import { brand } from '@/brand.config';
import { homeFor, useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { profileApi } from '@/lib/profileApi';
import { cn } from '@/lib/cn';
import { AchievementsSection, DocumentsSection, PhotoSection, useProfile } from '@/components/profile/ProfileSections';
import { Button, useToast } from '@/components/ui';

const STEPS = ['photo', 'achievements', 'documents'] as const;

/** First sign-in: the employee fills in the profile (photo is required, the rest can be added later). */
export default function ProfileSetup() {
  const { t } = useTranslation();
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const { data } = useProfile();
  const finish = useMutation({
    mutationFn: profileApi.complete,
    onSuccess: async () => {
      await refresh();
      toast(t('profile.done'));
      navigate(homeFor(user!.role), { replace: true });
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  if (!user) return <Navigate to="/login" replace />;
  if (user.profileCompletedAt) return <Navigate to={homeFor(user.role)} replace />;
  const hasPhoto = !!data?.user.photoUrl;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src={brand.logo} alt="" className="h-9 w-9 rounded-full" />
          <span className="flex-1">{brand.name}</span>
          <button onClick={logout} aria-label={t('auth.logout')} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 md:py-8">
        <div>
          <h1 className="text-2xl">{t('profile.setupTitle', { name: user.fullName.split(' ')[1] ?? user.fullName })}</h1>
          <p className="mt-1 text-text-muted">{t('profile.setupHint')}</p>
        </div>

        <ol className="flex items-center gap-2" aria-label={t('profile.title')}>
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm', i < step ? 'border-primary bg-primary text-white' : i === step ? 'border-primary text-primary' : 'border-border text-text-muted')}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden text-sm sm:block', i === step ? '' : 'text-text-muted')}>{t(`profile.steps.${s}`)}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <h2 className="text-lg">{t(`profile.steps.${STEPS[step]!}`)}{step === 0 && <span className="text-danger"> *</span>}</h2>
        {step === 0 && <PhotoSection />}
        {step === 1 && <AchievementsSection saveLabel={t('profile.saveAndNext')} onSaved={() => setStep(2)} />}
        {step === 2 && <DocumentsSection />}

        <div className="flex justify-between gap-3">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t('common.back')}</Button>
          {step === 0 && <Button disabled={!hasPhoto} onClick={() => setStep(1)}>{t('profile.next')}</Button>}
          {step === 1 && <Button variant="secondary" onClick={() => setStep(2)}>{t('profile.skip')}</Button>}
          {step === 2 && <Button loading={finish.isPending} disabled={!hasPhoto} onClick={() => finish.mutate()}>{t('profile.finish')}</Button>}
        </div>
      </main>
    </div>
  );
}
