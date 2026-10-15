import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { Modal } from './ui';

/** Big QR code of a link (made in the browser, the link is not sent anywhere). */
export function QrModal({ title, url, onClose }: { title: string; url: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (url) void QRCode.toDataURL(url, { width: 640, margin: 1, color: { dark: '#1A3F7A', light: '#FFFFFF' } }).then(setQr);
    else setQr('');
  }, [url]);
  return (
    <Modal open={!!url} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-3">
        {qr && <img src={qr} alt={t('plans.share.qr')} className="h-72 w-72" />}
        <p className="break-all text-center font-mono text-xs text-text-muted">{url}</p>
        {qr && <a href={qr} download={`${title}.png`} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Download className="h-4 w-4" /> {t('plans.share.downloadQr')}</a>}
      </div>
    </Modal>
  );
}
