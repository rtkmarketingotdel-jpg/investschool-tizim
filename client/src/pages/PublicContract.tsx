import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileSignature, ShieldCheck } from 'lucide-react';
import { brand } from '@/brand.config';
import { api, errorCode } from '@/lib/api';
import { financeApi } from '@/lib/financeApi';
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '@/components/ui';

// Public page: parents are not logged in, so its texts follow the contract language (not the staff UI language).
const TXT = {
  uz: {
    title: 'Elektron shartnoma', download: 'PDF yuklab olish', agree: 'Tanishib chiqdim va roziman', getCode: 'Tasdiqlash kodini olish',
    codeSent: 'Tasdiqlash kodi yuborildi. Kodni kiriting:', code: '6 xonali kod', confirm: 'Tasdiqlash', signed: 'Shartnoma imzolandi', signedAt: 'Tasdiqlangan',
    demo: 'Demo rejim', demoHint: 'Demo rejimda kod maktab xodimlariga koʻrinadi.', notFound: 'Shartnoma topilmadi yoki havola yaroqsiz',
    errors: { OTP_INVALID: 'Kod notoʻgʻri', OTP_EXPIRED: 'Kod muddati tugadi, yangisini oling', OTP_TOO_MANY_ATTEMPTS: 'Urinishlar soni tugadi, yangi kod oling', OTP_TOO_SOON: 'Yangi kodni biroz kutib soʻrang', OTP_NOT_REQUESTED: 'Avval kodni oling', CONTRACT_NOT_SIGNABLE: 'Bu shartnomani imzolab boʻlmaydi', TOO_MANY_REQUESTS: 'Juda koʻp urinish', default: 'Xatolik yuz berdi' },
  },
  ru: {
    title: 'Электронный договор', download: 'Скачать PDF', agree: 'Ознакомился и согласен', getCode: 'Получить код подтверждения',
    codeSent: 'Код подтверждения отправлен. Введите код:', code: '6-значный код', confirm: 'Подтвердить', signed: 'Договор подписан', signedAt: 'Подтверждён',
    demo: 'Демо-режим', demoHint: 'В демо-режиме код виден сотрудникам школы.', notFound: 'Договор не найден или ссылка недействительна',
    errors: { OTP_INVALID: 'Неверный код', OTP_EXPIRED: 'Срок действия кода истёк, получите новый', OTP_TOO_MANY_ATTEMPTS: 'Попытки исчерпаны, получите новый код', OTP_TOO_SOON: 'Запросите новый код чуть позже', OTP_NOT_REQUESTED: 'Сначала получите код', CONTRACT_NOT_SIGNABLE: 'Этот договор нельзя подписать', TOO_MANY_REQUESTS: 'Слишком много попыток', default: 'Произошла ошибка' },
  },
} as const;

export default function PublicContract() {
  const { token = '' } = useParams();
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [signedNow, setSignedNow] = useState(false);
  const q = useQuery({ queryKey: ['public-contract', token], queryFn: () => financeApi.publicContract(token), retry: false });

  const lang = q.data?.language ?? 'uz';
  const x = TXT[lang];
  const fail = (e: unknown) => {
    const c = errorCode(e);
    setError((x.errors as Record<string, string>)[c] ?? x.errors.default);
  };
  const otp = useMutation({ mutationFn: () => financeApi.requestOtp(token), onSuccess: () => { setSent(true); setError(''); }, onError: fail });
  const sign = useMutation({ mutationFn: () => financeApi.signContract(token, code), onSuccess: () => { setSignedNow(true); void q.refetch(); }, onError: fail });

  const downloadPdf = async () => {
    const res = await api.get<Blob>(`/public/contracts/${token}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${q.data?.number ?? 'contract'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (q.isLoading) return <div className="mx-auto max-w-2xl space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>;
  if (q.isError || !q.data) return <div className="mx-auto max-w-2xl p-4 pt-16"><EmptyState icon={FileSignature} title={TXT.uz.notFound} /></div>;
  const c = q.data;
  const isSigned = c.status === 'SIGNED';

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <img src={brand.logo} alt="" className="h-9 w-9 rounded-full" />
          <span className="flex-1 font-medium">{c.school}</span>
          {c.demoMode && <Badge tone="warning">{x.demo}</Badge>}
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-medium">{x.title} № {c.number}</h1>
          <Button variant="secondary" className="px-4 py-2" onClick={() => void downloadPdf()}><Download className="h-4 w-4" /> {x.download}</Button>
        </div>

        <Card className="space-y-4 p-5 text-[15px] leading-relaxed">
          {c.blocks.map((b, i) => (
            <section key={i}>
              {b.heading && <h2 className="mb-1 font-medium">{b.heading}</h2>}
              {b.paragraphs.map((p, j) => <p key={j} className="mb-1.5">{p}</p>)}
            </section>
          ))}
        </Card>

        {isSigned ? (
          <Card className="flex items-center gap-3 border-green-600/40 bg-[#DCFCE7] text-[#15803D] dark:bg-green-500/15 dark:text-green-400">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-medium">{x.signed}</p>
              {c.signedAt && <p className="text-sm">{x.signedAt}: {new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tashkent' }).format(new Date(c.signedAt))}</p>}
              {signedNow && <p className="text-sm">✓</p>}
            </div>
          </Card>
        ) : (
          <Card className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-[rgb(var(--primary))]" />
              <span className="font-medium">{x.agree}</span>
            </label>
            {!sent ? (
              <Button className="w-full" disabled={!agree} loading={otp.isPending} onClick={() => otp.mutate()}>{x.getCode}</Button>
            ) : (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(''); if (code.length === 6) sign.mutate(); }}>
                <p className="text-sm text-text-muted">{x.codeSent}</p>
                {c.demoMode && <p className="text-sm text-warning">{x.demoHint}</p>}
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={x.code} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-2xl tracking-[0.5em]" aria-label={x.code} />
                <Button type="submit" className="w-full" disabled={code.length !== 6} loading={sign.isPending}>{x.confirm}</Button>
                <button type="button" onClick={() => { setSent(false); setCode(''); }} className="w-full text-sm text-text-muted hover:text-text">{x.getCode}</button>
              </form>
            )}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </Card>
        )}
      </main>
    </div>
  );
}
