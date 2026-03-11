'use client';

import * as React from 'react';
import { MoneyDisplay, ConfirmDialog } from '@pokimate/ui';
import type { Budget, Category } from '@pokimate/shared';
import { useDeleteBudget } from '@/hooks/useBudgets';

interface Props {
  budget: Budget;
  category: Category | undefined;
  spentMinor: number;
  daysLeft: number;
  onEdit: (budget: Budget) => void;
}

function barColor(pct: number): string {
  if (pct >= 100) return 'var(--destructive)';
  if (pct >= 80) return 'var(--warning, #d97706)';
  return 'var(--success, #16a34a)';
}

export function BudgetCard({ budget, category, spentMinor, daysLeft, onEdit }: Props) {
  const deleteMutation = useDeleteBudget();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const spentBp = budget.limit_minor > 0
    ? Math.round((spentMinor / budget.limit_minor) * 100)
    : 0;
  const pctClamped = Math.min(spentBp, 100);
  const color = barColor(spentBp);

  return (
    <div
      className="rounded-xl border p-4 space-y-3 flex flex-col"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category?.icon ?? '💰'}</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              {category?.name ?? 'Unknown'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {daysLeft} days left
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(budget)}
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
          <span>
            <MoneyDisplay paise={BigInt(spentMinor)} /> spent
          </span>
          <span>
            <MoneyDisplay paise={BigInt(budget.limit_minor)} /> limit
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pctClamped}%`, background: color }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="font-semibold" style={{ color }}>{spentBp}% used</span>
          {spentBp >= budget.alert_threshold_pct && (
            <span className="font-medium" style={{ color }}>
              {spentBp >= 100 ? '🚨 Over budget' : '⚠️ Alert'}
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Budget"
        description={`Remove the budget for "${category?.name}"? This action sets it as deleted and can be recovered from Settings.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate(budget.id)}
      />
    </div>
  );
}
