'use client';

import * as React from 'react';
import { Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import {
  StatRing,
  MoneyDisplay,
  MoneyInput,
  LoadingShimmer,
  EmptyState,
  ConfirmDialog,
} from '@pokimate/ui';
import type { Goal, GoalDeposit } from '@pokimate/shared';
import {
  useGoals,
  useGoalDeposits,
  useCreateGoal,
  useAddDeposit,
  useSoftDeleteGoal,
} from '@/hooks/useGoals';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#5b6cf9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const ICON_OPTIONS = [
  { key: 'target', emoji: '🎯' },
  { key: 'home', emoji: '🏠' },
  { key: 'car', emoji: '🚗' },
  { key: 'travel', emoji: '✈️' },
  { key: 'education', emoji: '🎓' },
  { key: 'health', emoji: '🏥' },
  { key: 'wedding', emoji: '💍' },
  { key: 'savings', emoji: '💰' },
  { key: 'emergency', emoji: '🛡️' },
  { key: 'business', emoji: '💼' },
  { key: 'gadget', emoji: '📱' },
  { key: 'gift', emoji: '🎁' },
];

const ICON_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  ICON_OPTIONS.map(({ key, emoji }) => [key, emoji])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysRemaining(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function onTrackStatus(goal: Goal): 'on_track' | 'behind' | 'none' {
  if (!goal.target_date) return 'none';
  const created = new Date(goal.created_at);
  const end = new Date(goal.target_date);
  const today = new Date();
  const totalDays = Math.max(1, (end.getTime() - created.getTime()) / 86400000);
  const elapsed = Math.max(0, (today.getTime() - created.getTime()) / 86400000);
  const timeRatio = elapsed / totalDays;
  const progressRatio = goal.target_amount_minor > 0
    ? goal.current_amount_minor / goal.target_amount_minor
    : 0;
  return progressRatio >= timeRatio ? 'on_track' : 'behind';
}

// ── AddGoalSheet ──────────────────────────────────────────────────────────────

interface AddGoalSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AddGoalSheet({ open, onOpenChange }: AddGoalSheetProps) {
  const createGoal = useCreateGoal();
  const [title, setTitle] = React.useState('');
  const [targetPaise, setTargetPaise] = React.useState<bigint>(BigInt(0));
  const [targetDate, setTargetDate] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('target');
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[1]);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setTitle('');
    setTargetPaise(BigInt(0));
    setTargetDate('');
    setSelectedIcon('target');
    setSelectedColor(PRESET_COLORS[1]);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetPaise <= 0) return;
    setSubmitting(true);
    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        target_amount_minor: Number(targetPaise),
        target_date: targetDate || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="absolute right-0 top-0 h-full w-[420px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">New Goal</h2>
          <button onClick={handleClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Goal Title</label>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Emergency Fund"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Amount</label>
            <MoneyInput valuePaise={targetPaise} onChange={setTargetPaise} placeholder="₹0" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Date (optional)</label>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map(({ key, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedIcon(key)}
                  className="h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all"
                  style={{
                    background: selectedIcon === key ? selectedColor + '33' : 'var(--muted)',
                    border: selectedIcon === key ? `2px solid ${selectedColor}` : '2px solid transparent',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="h-8 w-8 rounded-full transition-all"
                  style={{
                    background: color,
                    outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button type="button" onClick={handleClose} className="flex-1 rounded-md py-2 text-sm font-medium border border-border hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || targetPaise <= 0}
              className="flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {submitting ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── GoalDetailSheet ───────────────────────────────────────────────────────────

interface GoalDetailSheetProps {
  goal: Goal | null;
  onClose: () => void;
}

function GoalDetailSheet({ goal, onClose }: GoalDetailSheetProps) {
  const addDeposit = useAddDeposit();
  const depositsQuery = useGoalDeposits(goal?.id ?? '');
  const deposits = depositsQuery.data ?? [];

  const [depositPaise, setDepositPaise] = React.useState<bigint>(BigInt(0));
  const [note, setNote] = React.useState('');
  const [depositDate, setDepositDate] = React.useState(todayStr());
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setDepositPaise(BigInt(0));
    setNote('');
    setDepositDate(todayStr());
  }, [goal?.id]);

  if (!goal) return null;

  const pct = goal.target_amount_minor > 0
    ? Math.round((goal.current_amount_minor / goal.target_amount_minor) * 100)
    : 0;

  const daysLeft = goal.target_date ? daysRemaining(goal.target_date) : null;

  // Build cumulative chart data
  const sortedDeposits = [...deposits].sort(
    (a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
  );
  let running = 0;
  const chartData = sortedDeposits.map((d) => {
    running += d.amount_minor;
    return {
      date: d.deposit_date.slice(5), // "MM-DD"
      amount: running / 100,
    };
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositPaise <= 0) return;
    setSubmitting(true);
    try {
      await addDeposit.mutateAsync({
        goal_id: goal.id,
        amount_minor: Number(depositPaise),
        note: note.trim() || undefined,
        deposit_date: depositDate,
      });
      setDepositPaise(BigInt(0));
      setNote('');
      setDepositDate(todayStr());
    } finally {
      setSubmitting(false);
    }
  };

  // Compute running totals for timeline
  let runningTotal = 0;
  const depositsWithTotal = [...deposits]
    .sort((a, b) => new Date(b.deposit_date).getTime() - new Date(a.deposit_date).getTime())
    .map((d) => {
      runningTotal += d.amount_minor;
      return { ...d, running: runningTotal };
    });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full w-[520px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{ICON_EMOJI_MAP[goal.icon] ?? '🎯'}</span>
            {goal.title}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>

        <div className="flex-1 flex flex-col gap-6 p-5">
          {/* Progress ring + amounts */}
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <StatRing value={pct} size={120} strokeWidth={12} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{pct}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Saved</p>
                <MoneyDisplay paise={BigInt(goal.current_amount_minor)} className="text-2xl font-bold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <MoneyDisplay paise={BigInt(goal.target_amount_minor)} className="text-lg font-semibold text-muted-foreground" />
              </div>
              {daysLeft !== null && (
                <p className="text-xs text-muted-foreground">
                  {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? 'Due today!' : `${Math.abs(daysLeft)} days overdue`}
                </p>
              )}
            </div>
          </div>

          {/* Progress chart */}
          {chartData.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">Deposit Progress</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Add deposit */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold mb-3">Add Deposit</p>
            <form onSubmit={handleDeposit} className="flex flex-col gap-3">
              <MoneyInput valuePaise={depositPaise} onChange={setDepositPaise} placeholder="₹0" />
              <textarea
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Note (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <input
                type="date"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
              />
              <button
                type="submit"
                disabled={submitting || depositPaise <= 0}
                className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                {submitting ? 'Adding…' : 'Add Deposit'}
              </button>
            </form>
          </div>

          {/* Deposit timeline */}
          {depositsWithTotal.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3">Deposit History</p>
              <div className="space-y-2">
                {depositsWithTotal.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start gap-3 rounded-lg p-3"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{d.deposit_date}</p>
                      {d.note && <p className="text-xs text-foreground mt-0.5">{d.note}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <MoneyDisplay paise={BigInt(d.amount_minor)} className="text-sm font-semibold" />
                      <p className="text-[10px] text-muted-foreground">
                        Total: {fmtRupees(d.running)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { setActions } = useTopbarActions();
  const [addSheetOpen, setAddSheetOpen] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Goal | null>(null);

  const goalsQuery = useGoals();
  const goals = goalsQuery.data ?? [];
  const softDelete = useSoftDeleteGoal();

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => setAddSheetOpen(true)}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={16} /> Add Goal
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  if (goalsQuery.isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <LoadingShimmer key={i} variant="card" />)}
      </div>
    );
  }

  return (
    <div className="p-6">
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={40} className="text-muted-foreground" />}
          title="No goals yet"
          description="Track savings goals and watch your progress grow."
          action={
            <button
              onClick={() => setAddSheetOpen(true)}
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              Add your first goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const pct = goal.target_amount_minor > 0
              ? Math.round((goal.current_amount_minor / goal.target_amount_minor) * 100)
              : 0;
            const daysLeft = goal.target_date ? daysRemaining(goal.target_date) : null;
            const status = onTrackStatus(goal);

            return (
              <div
                key={goal.id}
                className="rounded-xl p-5 cursor-pointer hover:shadow-md transition-all flex flex-col gap-4"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderTop: `4px solid ${goal.color}`,
                }}
                onClick={() => setSelectedGoal(goal)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ICON_EMOJI_MAP[goal.icon] ?? '🎯'}</span>
                    <p className="font-semibold text-sm text-foreground leading-tight">{goal.title}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(goal); }}
                    className="rounded-md p-1 hover:bg-muted text-muted-foreground"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress ring */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <StatRing value={pct} size={80} strokeWidth={8} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Saved</p>
                      <MoneyDisplay paise={BigInt(goal.current_amount_minor)} className="text-base font-bold" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Target</p>
                      <MoneyDisplay paise={BigInt(goal.target_amount_minor)} className="text-sm text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Footer chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {goal.target_date && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      📅 {goal.target_date}
                    </span>
                  )}
                  {daysLeft !== null && daysLeft >= 0 && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      {daysLeft}d left
                    </span>
                  )}
                  {status === 'on_track' && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5 font-medium"
                      style={{ background: 'var(--chart-2)' + '22', color: 'var(--chart-2)' }}
                    >
                      <TrendingUp size={10} className="inline mr-0.5" /> On Track
                    </span>
                  )}
                  {status === 'behind' && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5 font-medium"
                      style={{ background: 'var(--chart-3)' + '22', color: 'var(--chart-3)' }}
                    >
                      Behind
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Goal"
        description={`Delete "${deleteTarget?.title}"? All deposits will be hidden.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) softDelete.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <AddGoalSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />

      <GoalDetailSheet goal={selectedGoal} onClose={() => setSelectedGoal(null)} />
    </div>
  );
}
