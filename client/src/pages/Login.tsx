import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { brand } from '@/brand.config';
import { homeFor, useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { maskPhone, phoneToApi } from '@/lib/format';
import { Button, Input } from '@/components/ui';

const DEMO = [
  { role: 'DIRECTOR', phone: '+998900000001' },
];

export default function Login() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(phoneToApi(phone), password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      const code = errorCode(err);
      setError(t(`errors.${code}`, { defaultValue: t('errors.INTERNAL_ERROR') }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md space-y-5">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={brand.logo} alt="" className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-medium">{brand.name}</span>
          </div>
          <div>
            <h1 className="text-[28px] font-medium">{t('auth.loginTitle')}</h1>
            <p className="mt-1 text-text-muted">{t('auth.loginSubtitle')}</p>
          </div>
          <Input
            id="phone"
            label={t('auth.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="username"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />
          <Input
            id="password"
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#B91C1C] dark:bg-red-500/15 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy} className="w-full">
            {t('auth.submit')}
          </Button>

          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div className="border-t border-border pt-5">
              <p className="mb-2 text-sm text-text-muted">{t('auth.demoAccounts')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    className="rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    onClick={() => {
                      setPhone(maskPhone(d.phone));
                      setPassword('demo1234');
                    }}
                  >
                    <span className="block font-medium">{t(`roles.${d.role}`)}</span>
                    <span className="text-text-muted">{d.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
      <div className="hidden flex-col items-center justify-center gap-6 bg-primary p-12 text-white lg:flex">
        <img src={brand.logo} alt="" className="h-24 w-24 rounded-3xl shadow-xl" />
        <h2 className="text-4xl font-medium">{brand.name}</h2>
        <p className="text-lg text-white/80">{t('brand.slogan')}</p>
      </div>
    </div>
  );
}
