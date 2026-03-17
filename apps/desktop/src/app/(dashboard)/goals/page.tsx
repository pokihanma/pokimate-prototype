'use client';

import * as React from 'react';
import { Plus, Target, Trash2, TrendingUp, Zap } from 'lucide-react';
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
  { key: 'book', emoji: '📚' },
  { key: 'run', emoji: '🏃' },
  { key: 'meditate', emoji: '🧘' },
  { key: 'laptop', emoji: '💻' },
  { key: 'plane', emoji: '🛫' },
  { key: 'shield', emoji: '🛡️' },
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
  const target = goal.goal_type === 'activity'
    ? (goal.target_value ?? 1)
    : goal.target_amount_minor;
  const current = goal.goal_type === 'activity'
    ? goal.current_amount_minor
    : goal.current_amount_minor;
  const progressRatio = target > 0 ? current / target : 0;
  return progressRatio >= timeRatio ? 'on_track' : 'behind';
}

// ── AddGoalSheet ──────────────────────────────────────────────────────────────

interface AddGoalSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AddGoalSheet({ open, onOpenChange }: AddGoalSheetProps) {
  const createGoal = useCreateGoal();
  const [goalType, setGoalType] = React.useState<'money' | 'activity'>('money');
  const [title, setTitle] = React.useState('');
  const [targetPaise, setTargetPaise] = React.useState<bigint>(BigInt(0));
  const [targetValue, setTargetValue] = React.useState('');
  const [unitLabel, setUnitLabel] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('target');
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[1]);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setGoalType('money');
    setTitle('');
    setTargetPaise(BigInt(0));
    setTargetValue('');
    setUnitLabel('');
    setTargetDate('');
    setSelectedIcon('target');
    setSelectedColor(PRESET_COLORS[1]);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const isValid = goalType === 'money'
    ? title.trim() && targetPaise > 0
    : title.trim() && Number(targetValue) > 0 && unitLabel.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      if (goalType === 'money') {
        await createGoal.mutateAsync({
          title: title.trim(),
          goal_type: 'money',
          target_amount_minor: Number(targetPaise),
          target_date: targetDate || undefined,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await createGoal.mutateAsync({
          title: title.trim(),
          goal_type: 'activity',
          target_amount_minor: 0,
          target_value: Number(targetValue),
          unit_label: unitLabel.trim(),
          target_date: targetDate || undefined,
          icon: selectedIcon,
          color: selectedColor,
        });
      }
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
          {/* Goal type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Goal Type</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(['money', 'activity'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGoalType(t)}
                  className="flex-1 py-2 text-sm font-medium transition-all"
                  style={{
                    background: goalType === t ? 'var(--primary)' : 'var(--muted)',
                    color: goalType === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {t === 'money' ? '💰 Money Goal' : '⚡ Activity Goal'}
                </button>
              ))}
            </div>
          </div>

          {/* Goal name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Goal Title</label>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={goalType === 'money' ? 'e.g. Emergency Fund' : 'e.g. Complete React Course'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {goalType === 'money' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Target Amount</label>
              <MoneyInput valuePaise={targetPaise} onChange={setTargetPaise} placeholder="₹0" />
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Target Number</label>
                  <input
                    type="number"
                    min="1"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="30"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Unit Label</label>
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="lessons, km, books…"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Deadline (optional)</label>
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
              {ICON_OPTIONS.slice(0, 12).map(({ key, emoji }) => (
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
              disabled={submitting || !isValid}
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

// ── UpdateProgressSheet (for activity goals) ──────────────────────────────────

interface UpdateProgressProps {
  goal: Goal | null;
  onClose: () => void;
}

function UpdateProgressSheet({ goal, onClose }: UpdateProgressProps) {
  const addDeposit = useAddDeposit();
  const [increment, setIncrement] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setIncrement('');
    setNote('');
  }, [goal?.id]);

  if (!goal || goal.goal_type !== 'activity') return null;

  const currentVal = goal.current_amount_minor;
  const targetVal = goal.target_value ?? 1;
  const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(increment);
    if (!val || val <= 0) return;
    setSubmitting(true);
    try {
      await addDeposit.mutateAsync({
        goal_id: goal.id,
        amount_minor: val,
        note: note.trim() || undefined,
        deposit_date: todayStr(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full w-[380px] flex flex-col shadow-2xl"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Update Progress</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <div className="flex-1 flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <StatRing value={pct} size={80} strokeWidth={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{pct}%</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm">{goal.title}</p>
              <p className="text-sm text-muted-foreground">
                {currentVal} / {targetVal} {goal.unit_label}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Progress to add ({goal.unit_label})
              </label>
              <input
                type="number"
                min="1"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`How many ${goal.unit_label} completed?`}
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Note (optional)</label>
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !increment || Number(increment) <= 0}
              className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {submitting ? 'Saving…' : 'Update Progress'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── GoalDetailSheet (money goals) ─────────────────────────────────────────────

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

  const sortedDeposits = [...deposits].sort(
    (a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
  );
  let running = 0;
  const chartData = sortedDeposits.map((d) => {
    running += d.amount_minor;
    return { date: d.deposit_date.slice(5), amount: running / 100 };
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

          {chartData.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">Deposit Progress</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="amount" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

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
                      <p className="text-[10px] text-muted-foreground">Total: {fmtRupees(d.running)}</p>
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
  const [selectedMoneyGoal, setSelectedMoneyGoal] = React.useState<Goal | null>(null);
  const [selectedActivityGoal, setSelectedActivityGoal] = React.useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Goal | null>(null);

  const goalsQuery = useGoals();
  const goals = goalsQuery.data ?? [];
  const softDelete = useSoftDeleteGoal();

  const moneyGoals = goals.filter((g) => !g.goal_type || g.goal_type === 'money');
  const activityGoals = goals.filter((g) => g.goal_type === 'activity');

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

  if (goals.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Target size={40} className="text-muted-foreground" />}
          title="No goals yet"
          description="Track savings goals, activity targets, and watch your progress grow."
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
        <AddGoalSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Money Goals */}
      {moneyGoals.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            💰 Money Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {moneyGoals.map((goal) => {
              const pct = goal.target_amount_minor > 0
                ? Math.min(100, Math.round((goal.current_amount_minor / goal.target_amount_minor) * 100))
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
                  onClick={() => setSelectedMoneyGoal(goal)}
                >
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

                  <div className="flex items-center gap-2 flex-wrap">
                    {goal.target_date && (
                      <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        📅 {goal.target_date}
                      </span>
                    )}
                    {daysLeft !== null && daysLeft >= 0 && (
                      <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        {daysLeft}d left
                      </span>
                    )}
                    {status === 'on_track' && (
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--chart-2)' + '22', color: 'var(--chart-2)' }}>
                        <TrendingUp size={10} className="inline mr-0.5" /> On Track
                      </span>
                    )}
                    {status === 'behind' && (
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--chart-3)' + '22', color: 'var(--chart-3)' }}>
                        Behind
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Activity Goals */}
      {activityGoals.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} /> Activity Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activityGoals.map((goal) => {
              const targetVal = goal.target_value ?? 1;
              const currentVal = goal.current_amount_minor;
              const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));
              const daysLeft = goal.target_date ? daysRemaining(goal.target_date) : null;
              const status = onTrackStatus(goal);

              return (
                <div
                  key={goal.id}
                  className="rounded-xl p-5 flex flex-col gap-4"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderTop: `4px solid ${goal.color}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{ICON_EMOJI_MAP[goal.icon] ?? '⚡'}</span>
                      <p className="font-semibold text-sm text-foreground leading-tight">{goal.title}</p>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      className="rounded-md p-1 hover:bg-muted text-muted-foreground"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <StatRing value={pct} size={80} strokeWidth={8} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-lg font-bold text-foreground">{currentVal}</p>
                      <p className="text-sm text-muted-foreground">/ {targetVal} {goal.unit_label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {goal.target_date && (
                      <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        📅 {goal.target_date}
                      </span>
                    )}
                    {daysLeft !== null && daysLeft >= 0 && (
                      <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        {daysLeft}d left
                      </span>
                    )}
                    {status === 'on_track' && (
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--chart-2)' + '22', color: 'var(--chart-2)' }}>
                        <TrendingUp size={10} className="inline mr-0.5" /> On Track
                      </span>
                    )}
                    {status === 'behind' && (
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--chart-3)' + '22', color: 'var(--chart-3)' }}>
                        Behind
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedActivityGoal(goal)}
                    className="w-full rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: goal.color + '22', color: goal.color, border: `1px solid ${goal.color}44` }}
                  >
                    <Plus size={14} /> Update Progress
                  </button>
                </div>
              );
            })}
          </div>
        </section>
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
      <GoalDetailSheet goal={selectedMoneyGoal} onClose={() => setSelectedMoneyGoal(null)} />
      <UpdateProgressSheet goal={selectedActivityGoal} onClose={() => setSelectedActivityGoal(null)} />
    </div>
  );
}
