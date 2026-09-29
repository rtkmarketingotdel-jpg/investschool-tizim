import { maskPhone, phoneToApi } from '@/lib/format';
import { Input } from './ui';

interface Props {
  label: string;
  value: string; // API format "+998XXXXXXXXX" or ""
  onChange: (v: string) => void;
  error?: string;
}

export function PhoneInput({ label, value, onChange, error }: Props) {
  return (
    <Input
      label={label}
      type="tel"
      inputMode="tel"
      placeholder="+998 90 123 45 67"
      value={value ? maskPhone(value) : ''}
      error={error}
      onChange={(e) => {
        const masked = maskPhone(e.target.value);
        onChange(masked.replace(/\D/g, '').length <= 3 ? '' : phoneToApi(masked));
      }}
    />
  );
}
