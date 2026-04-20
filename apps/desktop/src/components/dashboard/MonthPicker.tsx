'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDisplay(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = value === currentMonth;

  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
    >
      <button
        type="button"
        className="p-0.5 rounded hover:bg-muted transition-colors"
        onClick={() => onChange(addMonths(value, -1))}
        aria-label="Previous month"
      >
        <CaretLeft size={14} />
      </button>
      <span className="min-w-[130px] text-center font-medium">{formatDisplay(value)}</span>
      <button
        type="button"
        className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-40"
        onClick={() => onChange(addMonths(value, 1))}
        disabled={isCurrentMonth}
        aria-label="Next month"
      >
        <CaretRight size={14} />
      </button>
    </div>
  );
}
