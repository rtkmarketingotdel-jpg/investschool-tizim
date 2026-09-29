import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorCode } from '@/lib/api';
import { financeApi, type Settings } from '@/lib/financeApi';
import { useToast } from '../ui';

export function useSaveSettings() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => financeApi.saveSettings(patch),
    onSuccess: (s) => {
      qc.setQueryData(['settings'], s);
      toast(t('settings.saved'));
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
}

export const numOrNaN = (v: string) => (v.trim() === '' ? NaN : Number(v));
