import { useTranslation } from 'react-i18next';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';
import { MyPayslips } from '@/components/attendance/MyPayslips';

export default function Me() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <h1 className="text-[28px] font-semibold">{t('nav.me')}</h1>
      <AttendanceSelf />
      <MyPayslips />
    </div>
  );
}
