import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi, type Settings } from '@/lib/financeApi';
import { Button, Card, Input, useToast } from '../ui';
import { useSaveSettings } from './shared';

export function TelegramTab({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveSettings();
  const [chat, setChat] = useState(settings.telegramChatId ?? '');
  const test = useMutation({
    mutationFn: financeApi.testTelegram,
    onSuccess: () => toast(t('settings.telegram.sent')),
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });
  return (
    <Card className="max-w-2xl space-y-5">
      <Input label={t('settings.telegram.chatId')} placeholder="-1001234567890" value={chat} onChange={(e) => setChat(e.target.value)} />
      <p className="text-sm text-text-muted">{t('settings.telegram.hint')}</p>
      <div className="flex flex-wrap gap-3">
        <Button loading={save.isPending} onClick={() => save.mutate({ telegramChatId: chat.trim() || null })}>{t('common.save')}</Button>
        <Button variant="secondary" loading={test.isPending} disabled={!settings.telegramChatId && !chat} onClick={() => test.mutate()}><Send className="h-5 w-5" /> {t('settings.telegram.test')}</Button>
      </div>
    </Card>
  );
}
