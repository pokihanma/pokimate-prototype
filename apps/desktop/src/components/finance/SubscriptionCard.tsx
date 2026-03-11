'use client';

import * as React from 'react';
import { MoneyDisplay, ConfirmDialog } from '@pokimate/ui';
import type { Subscription } from '@pokimate/shared';
import { useDeleteSubscription } from '@/hooks/useSubscriptions';

interface Props {
  subscription: Subscription;
  onEdit: (sub: Subscription) => void;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function urgencyColor(days: number, reminderDays: number): string {
  if (days <= 0) return 'var(--destructive)';
  if (days === 1) return 'var(--warning, #d97706)';
  if (days <= reminderDays) return 'var(--amber, #f59e0b)';
  return 'var(--muted-foreground)';
}

function urgencyLabel(days: number): string {
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

export function normalizeToMonthly(amountMinor: number, cycle: string): number {
  switch (cycle) {
    case 'yearly': return Math.round(amountMinor / 12);
    case 'quarterly': return Math.round(amountMinor / 3);
    case 'weekly': return Math.round(amountMinor * 4.333);
    default: return amountMinor;
  }
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
};

export function SubscriptionCard({ subscription: sub, onEdit }: Props) {
  const deleteMutation = useDeleteSubscription();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const days = daysUntil(sub.next_renewal_date);
  const color = urgencyColor(days, sub.reminder_days_before);
  const label = urgencyLabel(days);
  const renewalDate = new Date(sub.next_renewal_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{sub.name}</p>
          {sub.category && (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{sub.category}</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(sub)}
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

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            <MoneyDisplay paise={BigInt(sub.amount_minor)} />
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium" style={{ color }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{renewalDate}</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Subscription"
        description={`Remove "${sub.name}" from subscriptions? Recoverable from Settings within 30 days.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate(sub.id)}
      />
    </div>
  );
}
