import { formatINR } from '@pokimate/shared';

export interface MoneyDisplayProps {
  paise: bigint;
  className?: string;
}

/**
 * Renders paise as INR using en-IN locale (e.g. ₹1,23,456.78).
 */
export function MoneyDisplay({ paise, className = '' }: MoneyDisplayProps) {
  return <span className={className}>{formatINR(paise)}</span>;
}
