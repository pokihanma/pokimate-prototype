'use client';

import * as React from 'react';
import { MoneyDisplay, ConfirmDialog } from '@pokimate/ui';
import type { Debt } from '@pokimate/shared';
import { useDeleteDebt } from '@/hooks/useDebts';

interface Props {
  debt: Debt;
  onEdit: (debt: Debt) => void;
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  loan: 'Loan',
  credit_card: 'Credit Card',
  personal: 'Personal',
  other: 'Other',
};

const DEBT_TYPE_COLORS: Record<string, string> = {
  loan: 'var(--primary)',
  credit_card: 'var(--destructive)',
  personal: 'var(--warning, #d97706)',
  other: 'var(--muted-foreground)',
};

function calcPayoffDate(balance: number, minPayment: number, extraMonthly: number, annualRateBp: number): string {
  const monthly = minPayment + extraMonthly;
  if (monthly <= 0 || balance <= 0) return 'N/A';
  const monthlyRate = annualRateBp > 0 ? (annualRateBp / 10000) / 12 : 0;
  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthly);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  // n = -ln(1 - r*PV/PMT) / ln(1+r)
  const rPV = monthlyRate * balance;
  if (rPV >= monthly) return 'Never (payment too low)';
  const n = -Math.log(1 - rPV / monthly) / Math.log(1 + monthlyRate);
  const months = Math.ceil(n);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function DebtCard({ debt, onEdit }: Props) {
  const deleteMutation = useDeleteDebt();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [extraMinor, setExtraMinor] = React.useState(0);

  const paid = debt.principal_minor - debt.current_balance_minor;
  const paidPct = debt.principal_minor > 0 ? Math.max(0, Math.min(100, (paid / debt.principal_minor) * 100)) : 0;
  const rateDisplay = (debt.interest_rate_bp / 100).toFixed(2);
  const payoffDate = calcPayoffDate(
    debt.current_balance_minor,
    debt.min_payment_minor,
    extraMinor,
    debt.interest_rate_bp
  );

  return (
    <div
      className="rounded-xl border p-4 space-y-3 flex flex-col"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{debt.name}</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: (DEBT_TYPE_COLORS[debt.debt_type] ?? 'var(--muted)') + '22',
              color: DEBT_TYPE_COLORS[debt.debt_type] ?? 'var(--muted-foreground)',
            }}
          >
            {DEBT_TYPE_LABELS[debt.debt_type] ?? debt.debt_type}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(debt)}
            className="px-2 py-1 rounded text-xs hover:opacity-80"
            style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-2 py-1 rounded text-xs hover:opacity-80"
            style={{ background: 'var(--destructive)', color: '#fff' }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span>Paid: <MoneyDisplay paise={BigInt(Math.max(0, paid))} /></span>
          <span>Balance: <MoneyDisplay paise={BigInt(debt.current_balance_minor)} /></span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${paidPct}%`, background: 'var(--success, #16a34a)' }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{paidPct.toFixed(1)}% paid off</p>
      </div>

      <div className="flex gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <span>Rate: <strong style={{ color: 'var(--foreground)' }}>{rateDisplay}% p.a.</strong></span>
        <span>Min: <strong style={{ color: 'var(--foreground)' }}><MoneyDisplay paise={BigInt(debt.min_payment_minor)} />/mo</strong></span>
      </div>

      {/* Payoff calculator */}
      <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--muted)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Payoff Calculator</p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Extra ₹</span>
          <input
            type="number"
            min={0}
            value={extraMinor / 100}
            onChange={(e) => setExtraMinor(Math.round(parseFloat(e.target.value || '0') * 100))}
            className="w-24 rounded border px-2 py-1 text-xs"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            placeholder="0"
          />
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>/month</span>
        </div>
        <p className="text-xs">
          <span style={{ color: 'var(--muted-foreground)' }}>Pay off by: </span>
          <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{payoffDate}</span>
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Debt"
        description={`Remove "${debt.name}" from your debts? This will be soft-deleted and recoverable from Settings.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate(debt.id)}
      />
    </div>
  );
}
