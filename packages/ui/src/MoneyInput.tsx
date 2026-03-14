'use client';

import * as React from 'react';

export interface MoneyInputProps {
  valuePaise?: bigint;
  onChange: (paise: bigint) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function MoneyInput({
  valuePaise,
  onChange,
  className = '',
  placeholder = '0.00',
  disabled = false,
}: MoneyInputProps) {
  const [display, setDisplay] = React.useState(() => {
    if (!valuePaise || valuePaise === BigInt(0)) return '';
    return (Number(valuePaise) / 100).toFixed(2);
  });

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Only sync external valuePaise into display when the input is NOT focused
  // (e.g. when editing an existing record opens the sheet)
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      if (!valuePaise || valuePaise === BigInt(0)) {
        setDisplay('');
      } else {
        setDisplay((Number(valuePaise) / 100).toFixed(2));
      }
    }
  }, [valuePaise]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits with at most one decimal point and up to 2 decimal places
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
    setDisplay(raw);
    const rupees = parseFloat(raw);
    if (isNaN(rupees)) {
      onChange(BigInt(0));
    } else {
      onChange(BigInt(Math.round(rupees * 100)));
    }
  };

  const handleBlur = () => {
    const rupees = parseFloat(display);
    if (!isNaN(rupees) && rupees > 0) {
      setDisplay(rupees.toFixed(2));
    } else {
      setDisplay('');
      onChange(BigInt(0));
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
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
