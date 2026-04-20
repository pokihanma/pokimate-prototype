'use client';

import * as React from 'react';
import { LoadingShimmer, EmptyState, MoneyInput } from '@pokimate/ui';
import { CreditCard } from '@phosphor-icons/react';
import type { Debt } from '@pokimate/shared';
import { useDebts, useCreateDebt, useUpdateDebt } from '@/hooks/useDebts';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { DebtCard } from '@/components/finance/DebtCard';

const DEBT_TYPES = [
  { value: 'loan', label: 'Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

interface DebtSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Debt | null;
}

function DebtSheet({ open, onOpenChange, editing }: DebtSheetProps) {
  const create = useCreateDebt();
  const update = useUpdateDebt();
  const [name, setName] = React.useState(editing?.name ?? '');
  const [debtType, setDebtType] = React.useState(editing?.debt_type ?? 'loan');
  const [principalPaise, setPrincipalPaise] = React.useState<bigint>(BigInt(editing?.principal_minor ?? 0));
  const [balancePaise, setBalancePaise] = React.useState<bigint>(BigInt(editing?.current_balance_minor ?? 0));
  const [rateBp, setRateBp] = React.useState(editing ? (editing.interest_rate_bp / 100).toFixed(2) : '0');
  const [minPaise, setMinPaise] = React.useState<bigint>(BigInt(editing?.min_payment_minor ?? 0));
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDebtType(editing.debt_type);
      setPrincipalPaise(BigInt(editing.principal_minor));
      setBalancePaise(BigInt(editing.current_balance_minor));
      setRateBp((editing.interest_rate_bp / 100).toFixed(2));
      setMinPaise(BigInt(editing.min_payment_minor));
    } else {
      setName(''); setDebtType('loan');
      setPrincipalPaise(BigInt(0)); setBalancePaise(BigInt(0));
      setRateBp('0'); setMinPaise(BigInt(0));
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const rateBpInt = Math.round(parseFloat(rateBp || '0') * 100);
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          name,
          current_balance_minor: Number(balancePaise),
          interest_rate_bp: rateBpInt,
          min_payment_minor: Number(minPaise),
        });
      } else {
        await create.mutateAsync({
          name,
          debt_type: debtType,
          principal_minor: Number(principalPaise),
          current_balance_minor: Number(balancePaise),
          interest_rate_bp: rateBpInt,
          min_payment_minor: Number(minPaise),
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  const inputCls = 'w-full rounded-md border px-3 py-2 text-sm outline-none';
  const inputStyle = { background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => onOpenChange(false)} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col shadow-2xl" style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{editing ? 'Edit Debt' : 'Add Debt'}</h2>
          <button onClick={() => onOpenChange(false)} className="text-xl px-2 hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Home Loan, HDFC Credit Card" className={inputCls} style={inputStyle} />
          </div>
          {!editing && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Type</label>
              <select value={debtType} onChange={(e) => setDebtType(e.target.value)} className={inputCls} style={inputStyle}>
                {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
          {!editing && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Original Principal (₹)</label>
              <MoneyInput valuePaise={principalPaise} onChange={setPrincipalPaise} className={inputCls} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Current Balance (₹)</label>
            <MoneyInput valuePaise={balancePaise} onChange={setBalancePaise} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Interest Rate (% p.a.)</label>
            <input type="number" step="0.01" min="0" value={rateBp} onChange={(e) => setRateBp(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Min Monthly Payment (₹)</label>
            <MoneyInput valuePaise={minPaise} onChange={setMinPaise} className={inputCls} />
          </div>
        </form>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => onOpenChange(false)} className="flex-1 py-2 rounded-md border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={submitting || !name} className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {submitting ? 'Saving…' : editing ? 'Save' : 'Add Debt'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function DebtsPage() {
  const { data: debts = [], isLoading } = useDebts();
  const { setActions } = useTopbarActions();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editDebt, setEditDebt] = React.useState<Debt | null>(null);

  const totalBalance = debts.reduce((sum, d) => sum + d.current_balance_minor, 0);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => { setEditDebt(null); setSheetOpen(true); }}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
        style={{ background: 'var(--primary)' }}
      >
        + Add Debt
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Debts</h1>
        {debts.length > 0 && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Total outstanding: <span className="font-semibold" style={{ color: 'var(--destructive)' }}>
              ₹{(totalBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <LoadingShimmer key={i} variant="card" className="h-48" />)}
        </div>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="No debts tracked"
          description="Add loans, credit cards or personal debts to track payoff progress."
          action={
            <button onClick={() => setSheetOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
              + Add Debt
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              onEdit={(debt) => { setEditDebt(debt); setSheetOpen(true); }}
            />
          ))}
        </div>
      )}

      <DebtSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditDebt(null); }}
        editing={editDebt}
      />
    </div>
  );
}
