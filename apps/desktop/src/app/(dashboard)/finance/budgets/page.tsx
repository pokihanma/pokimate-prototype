'use client';

import * as React from 'react';
import { LoadingShimmer, EmptyState, MoneyInput } from '@pokimate/ui';
import { PiggyBank } from 'lucide-react';
import type { Budget, Category } from '@pokimate/shared';
import { useBudgets, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { BudgetCard } from '@/components/finance/BudgetCard';

function currentMonthRange(): { from_date: string; to_date: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  const mon = String(m).padStart(2, '0');
  return { from_date: `${y}-${mon}-01`, to_date: `${y}-${mon}-${last}` };
}

function daysLeftInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
}

interface BudgetSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  editing?: Budget | null;
}

function BudgetSheet({ open, onOpenChange, categories, editing }: BudgetSheetProps) {
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const [categoryId, setCategoryId] = React.useState(editing?.category_id ?? '');
  const [limitPaise, setLimitPaise] = React.useState<bigint>(BigInt(editing?.limit_minor ?? 0));
  const [threshold, setThreshold] = React.useState(editing?.alert_threshold_pct ?? 80);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setCategoryId(editing.category_id);
      setLimitPaise(BigInt(editing.limit_minor));
      setThreshold(editing.alert_threshold_pct);
    } else {
      setCategoryId('');
      setLimitPaise(BigInt(0));
      setThreshold(80);
    }
  }, [editing]);

  const expenseCategories = categories.filter((c) => c.type_ === 'expense');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, limit_minor: Number(limitPaise), alert_threshold_pct: threshold });
      } else {
        await create.mutateAsync({ category_id: categoryId, limit_minor: Number(limitPaise) });
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
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{editing ? 'Edit Budget' : 'Add Budget'}</h2>
          <button onClick={() => onOpenChange(false)} className="text-xl px-2 hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!editing && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={inputCls} style={inputStyle}>
                <option value="">— Select expense category —</option>
                {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Monthly Limit (₹)</label>
            <MoneyInput valuePaise={limitPaise} onChange={setLimitPaise} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between" style={{ color: 'var(--foreground)' }}>
              Alert Threshold <span style={{ color: 'var(--primary)' }}>{threshold}%</span>
            </label>
            <input
              type="range" min={50} max={100} value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <span>50%</span><span>100%</span>
            </div>
          </div>
        </form>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => onOpenChange(false)} className="flex-1 py-2 rounded-md border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={submitting || limitPaise === BigInt(0)} className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {submitting ? 'Saving…' : editing ? 'Save' : 'Add Budget'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: txns = [] } = useTransactions(currentMonthRange());
  const { setActions } = useTopbarActions();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editBudget, setEditBudget] = React.useState<Budget | null>(null);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const spentByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    txns.filter((t) => t.type_ === 'expense' && t.category_id).forEach((t) => {
      map.set(t.category_id!, (map.get(t.category_id!) ?? 0) + t.amount_minor);
    });
    return map;
  }, [txns]);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => { setEditBudget(null); setSheetOpen(true); }}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
        style={{ background: 'var(--primary)' }}
      >
        + Add Budget
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  const daysLeft = daysLeftInMonth();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Budgets</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{daysLeft} days remaining this month</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <LoadingShimmer key={i} variant="card" />)}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={48} />}
          title="No budgets yet"
          description="Set monthly spending limits per category to track and manage your expenses."
          action={
            <button onClick={() => setSheetOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
              + Add Budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              category={catMap.get(b.category_id)}
              spentMinor={spentByCategory.get(b.category_id) ?? 0}
              daysLeft={daysLeft}
              onEdit={(budget) => { setEditBudget(budget); setSheetOpen(true); }}
            />
          ))}
        </div>
      )}

      <BudgetSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditBudget(null); }}
        categories={categories}
        editing={editBudget}
      />
    </div>
  );
}
