'use client';

import * as React from 'react';
import { LoadingShimmer, EmptyState, MoneyInput, MoneyDisplay } from '@pokimate/ui';
import { CalendarClock } from 'lucide-react';
import type { Subscription } from '@pokimate/shared';
import { formatINR } from '@pokimate/shared';
import { useSubscriptions, useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { SubscriptionCard, normalizeToMonthly } from '@/components/finance/SubscriptionCard';

const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
];

interface SubSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Subscription | null;
}

function nextMonthDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function SubSheet({ open, onOpenChange, editing }: SubSheetProps) {
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const [name, setName] = React.useState(editing?.name ?? '');
  const [amountPaise, setAmountPaise] = React.useState<bigint>(BigInt(editing?.amount_minor ?? 0));
  const [cycle, setCycle] = React.useState(editing?.billing_cycle ?? 'monthly');
  const [renewalDate, setRenewalDate] = React.useState(editing?.next_renewal_date ?? nextMonthDate());
  const [category, setCategory] = React.useState(editing?.category ?? '');
  const [notes, setNotes] = React.useState(editing?.notes ?? '');
  const [reminderDays, setReminderDays] = React.useState(editing?.reminder_days_before ?? 3);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setName(editing.name);
      setAmountPaise(BigInt(editing.amount_minor));
      setCycle(editing.billing_cycle);
      setRenewalDate(editing.next_renewal_date);
      setCategory(editing.category ?? '');
      setNotes(editing.notes ?? '');
      setReminderDays(editing.reminder_days_before);
    } else {
      setName(''); setAmountPaise(BigInt(0)); setCycle('monthly');
      setRenewalDate(nextMonthDate()); setCategory(''); setNotes(''); setReminderDays(3);
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          name,
          amount_minor: Number(amountPaise),
          billing_cycle: cycle,
          next_renewal_date: renewalDate,
          reminder_days_before: reminderDays,
        });
      } else {
        await create.mutateAsync({
          name,
          amount_minor: Number(amountPaise),
          billing_cycle: cycle,
          next_renewal_date: renewalDate,
          category: category || null,
          notes: notes || null,
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
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{editing ? 'Edit Subscription' : 'Add Subscription'}</h2>
          <button onClick={() => onOpenChange(false)} className="text-xl px-2 hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Service Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Netflix, Spotify, AWS" className={inputCls} style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Amount (₹)</label>
            <MoneyInput valuePaise={amountPaise} onChange={setAmountPaise} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Billing Cycle</label>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputCls} style={inputStyle}>
              {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Next Renewal Date</label>
            <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required className={inputCls} style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Reminder <span style={{ color: 'var(--primary)' }}>{reminderDays} days</span> before
            </label>
            <input type="range" min={1} max={14} value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} className="w-full" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Category <span style={{ color: 'var(--muted-foreground)' }}>(optional)</span></label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Entertainment, Cloud, SaaS" className={inputCls} style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Notes <span style={{ color: 'var(--muted-foreground)' }}>(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} style={inputStyle} />
          </div>
        </form>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => onOpenChange(false)} className="flex-1 py-2 rounded-md border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={submitting || !name || amountPaise === BigInt(0)} className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {submitting ? 'Saving…' : editing ? 'Save' : 'Add Subscription'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function SubscriptionsPage() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { setActions } = useTopbarActions();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editSub, setEditSub] = React.useState<Subscription | null>(null);

  const totalMonthly = subscriptions.reduce(
    (sum, s) => sum + normalizeToMonthly(s.amount_minor, s.billing_cycle),
    0
  );

  const sortedSubs = React.useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      const dA = new Date(a.next_renewal_date).getTime();
      const dB = new Date(b.next_renewal_date).getTime();
      return dA - dB;
    });
  }, [subscriptions]);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => { setEditSub(null); setSheetOpen(true); }}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
        style={{ background: 'var(--primary)' }}
      >
        + Add
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Subscriptions</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Track recurring bills and renewals</p>
      </div>

      {/* Total monthly KPI */}
      {subscriptions.length > 0 && (
        <div
          className="rounded-xl border p-4 flex items-center justify-between"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Total monthly cost</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--foreground)' }}>
              {formatINR(BigInt(totalMonthly))}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              across {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} · normalized to monthly
            </p>
          </div>
          <CalendarClock size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <LoadingShimmer key={i} variant="card" />)}
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={48} />}
          title="No subscriptions"
          description="Track your recurring subscriptions and get renewal reminders before they're due."
          action={
            <button onClick={() => setSheetOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
              + Add Subscription
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSubs.map((s) => (
            <SubscriptionCard
              key={s.id}
              subscription={s}
              onEdit={(sub) => { setEditSub(sub); setSheetOpen(true); }}
            />
          ))}
        </div>
      )}

      <SubSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditSub(null); }}
        editing={editSub}
      />
    </div>
  );
}
