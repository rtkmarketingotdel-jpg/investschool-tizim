import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadUrl } from '@/lib/api';
import { Modal } from '../ui';

interface Props {
  url: string | null;
  title: string;
  lat?: number | null;
  lng?: number | null;
}

export function PhotoThumb({ url, title, lat, lng }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const src = uploadUrl(url);
  if (!src) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={title} className="shrink-0">
        <img src={src} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <img src={src} alt={title} className="w-full rounded-xl" />
        {lat != null && lng != null && (
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" /> {t('attendance.openMap')}
          </a>
        )}
      </Modal>
    </>
  );
}
