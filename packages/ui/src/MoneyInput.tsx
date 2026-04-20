'use client';
import * as React from 'react';

interface MoneyInputProps {
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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isFocused = React.useRef(false);

  // Convert paise to display string
  const paiseToDisplay = (p: bigint | undefined): string => {
    if (!p || p === BigInt(0)) return '';
    return (Number(p) / 100).toFixed(2);
  };

  const [display, setDisplay] = React.useState(() => paiseToDisplay(valuePaise));

  // Sync from external valuePaise changes only when not focused
  React.useEffect(() => {
    if (!isFocused.current) {
      setDisplay(paiseToDisplay(valuePaise));
    }
  }, [valuePaise]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, and one decimal with up to 2 places
    if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) return;
    setDisplay(raw);
    const rupees = parseFloat(raw);
    if (isNaN(rupees) || raw === '') {
      onChange(BigInt(0));
    } else {
      onChange(BigInt(Math.round(rupees * 100)));
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
    // Select all text on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    isFocused.current = false;
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
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
