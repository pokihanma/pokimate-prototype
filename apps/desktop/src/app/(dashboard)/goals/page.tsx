'use client';

import * as React from 'react';
import { Target, Plus, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { EmptyState, MoneyDisplay, MoneyInput } from '@pokimate/ui';
import { useGoals, useCreateGoal, useAddDeposit, useSoftDeleteGoal } from '@/hooks/useGoals';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { ConfirmDialog } from '@pokimate/ui';

function daysLeft(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ProgressRing({
  pct,
  size = 80,
  stroke = 6,
  color = 'var(--primary)',
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, onAddDeposit }: { goal: any; onAddDeposit: (g: any) => void }) {
  const deleteGoal = useSoftDeleteGoal();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const isActivity = goal.goal_type === 'activity';
  const target = isActivity ? (goal.target_value ?? 100) : Number(goal.target_amount_minor ?? 0);
  const current = isActivity ? (goal.current_value ?? 0) : Number(goal.current_amount_minor ?? 0);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const days = daysLeft(goal.target_date);
  const reached = pct >= 100;

  const ringColor = reached ? 'var(--success)' : pct > 60 ? 'var(--primary)' : pct > 30 ? 'var(--warning)' : 'var(--destructive)';

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{
        background: 'var(--card)',
        borderColor: reached ? 'var(--success)' : 'var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <ProgressRing pct={pct} color={ringColor} />
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums"
            style={{ color: ringColor }}
          >
            {Math.round(pct)}%
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{goal.icon || '🎯'}</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  {goal.title}
                </span>
                {reached && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
              </div>
              {/* Progress amount */}
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {isActivity ? (
                  <span>{current} / {target} {goal.unit_label || 'units'}</span>
                ) : (
                  <span>
                    <MoneyDisplay paise={BigInt(current)} /> / <MoneyDisplay paise={BigInt(target)} />
                  </span>
                )}
              </div>
            </div>

            {/* Days left badge */}
            {days !== null && (
              <div
                className="badge flex-shrink-0"
                style={{
                  background: days < 0 ? 'rgba(244,63,94,0.1)' : days < 30 ? 'rgba(245,158,11,0.1)' : 'var(--accent)',
                  color: days < 0 ? 'var(--destructive)' : days < 30 ? 'var(--warning)' : 'var(--primary)',
                  fontSize: 10,
                }}
              >
                <Calendar size={10} className="mr-1" />
                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: ringColor }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {!reached && (
              <button
                onClick={() => onAddDeposit(goal)}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'var(--accent)', color: 'var(--primary)' }}
              >
                <Plus size={12} />
                {isActivity ? 'Update Progress' : 'Add Deposit'}
              </button>
            )}
            <button
              onClick={() => setDeleteOpen(true)}
              className="px-3 py-1 rounded-lg text-xs"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Goal"
        description="This goal and all its progress will be hidden."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteGoal.mutate(goal.id)}
      />
    </div>
  );
}

// ── Add Goal Sheet ────────────────────────────────────────────────────────────
function AddGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createGoal = useCreateGoal();
  const [goalType, setGoalType] = React.useState<'money' | 'activity'>('money');
  const [title, setTitle] = React.useState('');
  const [icon, setIcon] = React.useState('🎯');
  const [targetPaise, setTargetPaise] = React.useState<bigint>(BigInt(0));
  const [targetValue, setTargetValue] = React.useState('');
  const [unitLabel, setUnitLabel] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const GOAL_EMOJIS = ['🎯', '💰', '🏠', '✈️', '📱', '🎓', '🏋️', '📚', '🎨', '💻', '🚀', '⭐'];

  const inputStyle = {
    background: 'var(--input)', border: '1px solid var(--border)',
    color: 'var(--foreground)', borderRadius: 8,
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        icon,
        goal_type: goalType,
        target_amount_minor: goalType === 'money' ? Number(targetPaise) : 0,
        target_value: goalType === 'activity' ? parseInt(targetValue) || 0 : 0,
        unit_label: goalType === 'activity' ? unitLabel : '',
        target_date: targetDate || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>Add Goal</h2>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Goal type toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['money', 'activity'] as const).map(t => (
              <button
                key={t}
                onClick={() => setGoalType(t)}
                className="flex-1 py-2.5 text-sm font-medium capitalize"
                style={{
                  background: goalType === t ? 'var(--primary)' : 'var(--input)',
                  color: goalType === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}
              >
                {t === 'money' ? '💰 Money Goal' : '🎯 Activity Goal'}
              </button>
            ))}
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_EMOJIS.map(e => (
                <button key={e} onClick={() => setIcon(e)}
                  className="text-xl rounded-lg w-10 h-10 flex items-center justify-center"
                  style={{ background: icon === e ? 'var(--accent)' : 'var(--muted)', border: icon === e ? '2px solid var(--primary)' : '2px solid transparent' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Goal Name</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={goalType === 'money' ? 'e.g. Emergency Fund' : 'e.g. Complete React Course'}
              className="w-full px-3 py-2 text-sm" style={inputStyle} autoFocus />
          </div>

          {/* Target */}
          {goalType === 'money' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Target Amount (₹)</label>
              <MoneyInput valuePaise={targetPaise} onChange={setTargetPaise}
                className="w-full px-3 py-2 text-sm" placeholder="0.00" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Target</label>
                <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)}
                  placeholder="e.g. 30" className="w-full px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Unit</label>
                <input value={unitLabel} onChange={e => setUnitLabel(e.target.value)}
                  placeholder="e.g. lessons, days, kg" className="w-full px-3 py-2 text-sm" style={inputStyle} />
              </div>
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Deadline (optional)</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            {submitting ? 'Adding…' : 'Add Goal'}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Deposit/Progress Sheet ────────────────────────────────────────────────────
function DepositSheet({ goal, onClose }: { goal: any; onClose: () => void }) {
  const addDeposit = useAddDeposit();
  const isActivity = goal?.goal_type === 'activity';
  const [amount, setAmount] = React.useState<bigint>(BigInt(0));
  const [progress, setProgress] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const inputStyle = { background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8 };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addDeposit.mutateAsync({
        goal_id: goal.id,
        amount_minor: isActivity ? parseInt(progress) || 0 : Number(amount),
        note: note || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!goal) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-sm flex flex-col"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
            {isActivity ? 'Update Progress' : 'Add Deposit'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <div className="flex-1 px-6 py-5 space-y-4">
          <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{goal.icon} {goal.title}</div>
          </div>
          {isActivity ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Progress to add ({goal.unit_label || 'units'})
              </label>
              <input type="number" value={progress} onChange={e => setProgress(e.target.value)}
                placeholder="e.g. 3" className="w-full px-3 py-2 text-sm" style={inputStyle} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Amount (₹)</label>
              <MoneyInput valuePaise={amount} onChange={setAmount} className="w-full px-3 py-2 text-sm" placeholder="0.00" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Completed module 3" className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const { setActions } = useTopbarActions();
  const [addOpen, setAddOpen] = React.useState(false);
  const [depositGoal, setDepositGoal] = React.useState<any>(null);

  React.useEffect(() => {
    setActions(
      <button onClick={() => setAddOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
        style={{ background: 'var(--primary)' }}>
        <Plus size={16} /> Add Goal
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  const moneyGoals = goals.filter((g: any) => g.goal_type !== 'activity');
  const activityGoals = goals.filter((g: any) => g.goal_type === 'activity');

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Goals</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {goals.length} active goal{goals.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border p-4 shimmer h-28" style={{ borderColor: 'var(--border)' }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target size={40} />}
          title="No goals yet"
          description="Set money saving goals or track activity goals like courses, fitness, and more."
          action={
            <button onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}>
              + Add Your First Goal
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {moneyGoals.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                💰 Money Goals
              </h2>
              <div className="space-y-3">
                {moneyGoals.map((g: any) => (
                  <GoalCard key={g.id} goal={g} onAddDeposit={setDepositGoal} />
                ))}
              </div>
            </div>
          )}
          {activityGoals.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
                🎯 Activity Goals
              </h2>
              <div className="space-y-3">
                {activityGoals.map((g: any) => (
                  <GoalCard key={g.id} goal={g} onAddDeposit={setDepositGoal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddGoalSheet open={addOpen} onClose={() => setAddOpen(false)} />
      {depositGoal && <DepositSheet goal={depositGoal} onClose={() => setDepositGoal(null)} />}
    </div>
  );
}
