import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useInstall } from '@/lib/useInstall';
import { brand } from '@/brand.config';
import { Button, IconButton, Modal } from './ui';

/** Opens the iOS "Add to Home Screen" steps (Safari has no install prompt). */
function IosSteps({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t('install.iosTitle')}>
      <ol className="space-y-4">
        <li className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Share className="h-5 w-5" /></span>
          <span className="pt-1.5">{t('install.iosStep1')}</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><SquarePlus className="h-5 w-5" /></span>
          <span className="pt-1.5">{t('install.iosStep2')}</span>
        </li>
        <li className="flex items-start gap-3">
          <img src={brand.logo} alt="" className="h-9 w-9 shrink-0 rounded-full" />
          <span className="pt-1.5">{t('install.iosStep3', { name: brand.shortName })}</span>
        </li>
      </ol>
      <p className="mt-4 text-sm text-text-muted">{t('install.iosNote')}</p>
      <Button className="mt-5 w-full" onClick={onClose}>{t('install.gotIt')}</Button>
    </Modal>
  );
}

function useInstallAction() {
  const { canInstall, canPrompt, install } = useInstall();
  const [steps, setSteps] = useState(false);
  return { canInstall, run: () => (canPrompt ? void install() : setSteps(true)), steps, setSteps };
}

/** Compact icon button for the top bar (hidden once the app is installed). */
export function InstallButton() {
  const { t } = useTranslation();
  const { canInstall, run, steps, setSteps } = useInstallAction();
  if (!canInstall) return null;
  return (
    <>
      <IconButton aria-label={t('install.button')} title={t('install.button')} onClick={run}><Download className="h-5 w-5" /></IconButton>
      <IosSteps open={steps} onClose={() => setSteps(false)} />
    </>
  );
}

const DISMISS_KEY = 'install-banner-dismissed';
const dismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/** Dismissible banner for the employee cabinet: most staff open the system from a phone. */
export function InstallBanner() {
  const { t } = useTranslation();
  const { canInstall, run, steps, setSteps } = useInstallAction();
  const [hidden, setHidden] = useState(dismissed);
  if (!canInstall || hidden) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl border border-border bg-primary-soft p-4 pr-12">
      <img src={brand.logo} alt="" className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 basis-40">
        <p>{t('install.bannerTitle')}</p>
        <p className="text-sm text-text-muted">{t('install.bannerText')}</p>
      </div>
      <Button className="w-full px-4 py-2.5 text-sm sm:w-auto" onClick={run}>{t('install.button')}</Button>
      <button aria-label={t('install.dismiss')} onClick={close} className="absolute right-2 top-2 rounded-lg p-2 text-text-muted hover:bg-surface-muted"><X className="h-4 w-4" /></button>
      <IosSteps open={steps} onClose={() => setSteps(false)} />
    </div>
  );
}
