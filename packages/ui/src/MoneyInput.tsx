'use client';

import * as React from 'react';
import { paise } from '@pokimate/shared';

export interface MoneyInputProps {
  valuePaise?: bigint;
  onChange: (paise: bigint) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Decimal rupee input; converts to paise on change and returns bigint.
 */
export function MoneyInput({
  valuePaise,
  onChange,
  placeholder = '0.00',
  className = '',
  disabled = false,
}: MoneyInputProps) {
  const [inputValue, setInputValue] = React.useState(() =>
    valuePaise !== undefined ? (Number(valuePaise) / 100).toFixed(2) : ''
  );

  React.useEffect(() => {
    if (valuePaise !== undefined) {
      setInputValue((Number(valuePaise) / 100).toFixed(2));
    }
  }, [valuePaise]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputValue(raw);
    const num = parseFloat(raw);
    if (!Number.isNaN(num) && num >= 0) {
      onChange(paise(num));
    } else {
      onChange(BigInt(0));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        borderColor: 'var(--border)',
      }}
    />
  );
}
