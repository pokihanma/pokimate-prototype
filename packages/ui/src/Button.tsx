import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

/**
 * Stub shared button — replace with shadcn/ui in Phase 2.
 */
export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
