import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, RefreshCw, Send } from 'lucide-react';
import { publicPlanUrl } from '@/lib/plansApi';
import { Button, Card } from '../ui';

interface Props {
  token: string;
  title: string;
  canRenew: boolean;
  renewing: boolean;
  onRenew: () => void;
}

/** Public link of a group plan: copy, open, QR code (made in the browser) and a Telegram share. */
export function SharePanel({ token, title, canRenew, renewing, onRenew }: Props) {
  const { t } = useTranslation();
  const url = publicPlanUrl(token);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    void QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#1A3F7A', light: '#FFFFFF' } }).then(setQr);
  }, [url]);
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg">{t('plans.share.title')}</h2>
        <p className="text-sm text-text-muted">{t('plans.share.hint')}</p>
      </div>
      <p className="break-all rounded-xl border border-border bg-surface-muted p-3 font-mono text-xs">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="px-3 py-2 text-sm" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t(copied ? 'finance.debtors.copied' : 'common.copy')}
        </Button>
        <a href={url} target="_blank" rel="noreferrer"><Button variant="secondary" className="w-full px-3 py-2 text-sm"><ExternalLink className="h-4 w-4" /> {t('plans.share.open')}</Button></a>
        <a href={telegram} target="_blank" rel="noreferrer" className="col-span-2"><Button className="w-full px-3 py-2 text-sm"><Send className="h-4 w-4" /> {t('plans.share.telegram')}</Button></a>
      </div>
      {qr && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-4">
          <img src={qr} alt={t('plans.share.qr')} className="h-44 w-44" />
          <a href={qr} download={`${title}.png`} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Download className="h-4 w-4" /> {t('plans.share.downloadQr')}</a>
        </div>
      )}
      {canRenew && (
        <button type="button" disabled={renewing} onClick={() => window.confirm(t('plans.share.renewConfirm')) && onRenew()} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-danger disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> {t('plans.share.renew')}
        </button>
      )}
    </Card>
  );
}
