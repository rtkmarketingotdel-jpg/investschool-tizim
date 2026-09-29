import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';

interface Props {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (photo: string, capturedAt: string) => void;
}

const MAX_SIDE = 720;

/** Live camera only: there is deliberately no file input, so gallery uploads are impossible. */
export function CameraCapture({ open, submitting, onCancel, onSubmit }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [shot, setShot] = useState<{ dataUrl: string; capturedAt: string } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('attendance.cameraDenied'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setError(t('attendance.cameraDenied'));
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    setShot(null);
    void start();
    return stop;
  }, [open, start, stop]);

  if (!open) return null;

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);

    const now = new Date();
    const stamp = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'medium',
    }).format(now);
    ctx.font = `600 ${Math.round(w / 22)}px Inter, sans-serif`;
    const pad = Math.round(w / 40);
    const textW = ctx.measureText(stamp).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w - textW - pad * 2, h - Math.round(w / 22) - pad * 2, textW + pad * 2, Math.round(w / 22) + pad * 2);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(stamp, w - textW - pad, h - pad);

    setShot({ dataUrl: canvas.toDataURL('image/jpeg', 0.7), capturedAt: now.toISOString() });
    stop();
  };

  const retake = () => {
    setShot(null);
    void start();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-semibold">{t('attendance.selfieTitle')}</span>
        <button aria-label={t('common.close')} onClick={onCancel} className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p role="alert" className="max-w-sm px-6 text-center text-white">{error}</p>
        ) : shot ? (
          <img src={shot.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted className="max-h-full max-w-full -scale-x-100 object-contain" />
        )}
      </div>

      <div className="flex justify-center gap-3 p-6">
        {error ? (
          <Button variant="secondary" onClick={() => void start()}>
            <RotateCcw className="h-5 w-5" /> {t('attendance.retry')}
          </Button>
        ) : shot ? (
          <>
            <Button variant="secondary" onClick={retake} disabled={submitting}>
              <RotateCcw className="h-5 w-5" /> {t('attendance.retake')}
            </Button>
            <Button loading={submitting} onClick={() => onSubmit(shot.dataUrl, shot.capturedAt)}>
              <Send className="h-5 w-5" /> {t('attendance.send')}
            </Button>
          </>
        ) : (
          <Button aria-label={t('attendance.capture')} onClick={capture} disabled={!!error} className="px-10">
            <Camera className="h-5 w-5" /> {t('attendance.capture')}
          </Button>
        )}
      </div>
    </div>
  );
}
