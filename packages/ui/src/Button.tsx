import * as React from 'react';

export function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  );
}
