'use client';

import * as React from 'react';
import {
  Plus,
  Target,
  Trash,
  TrendUp,
  Lightning,
  CalendarBlank,
  Bell,
  Trophy,
  House,
  Car,
  Airplane,
  GraduationCap,
  FirstAid,
  Ring,
  Money,
  ShieldCheck,
  Briefcase,
  DeviceMobile,
  Gift,
  BookOpen,
  PersonRunning,
  Laptop,
  Bicycle,
  Brain,
  Barbell,
} from '@phosphor-icons/react';
import {
  StatRing,
  MoneyDisplay,
  MoneyInput,
  LoadingShimmer,
  EmptyState,
  ConfirmDialog,
} from '@pokimate/ui';
import type { Goal } from '@pokimate/shared';
import {
  useGoals,
  useGoalDeposits,
  useCreateGoal,
  useAddDeposit,
  useSoftDeleteGoal,
} from '@/hooks/useGoals';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ── Icon system (Phosphor SVG) ────────────────────────────────────────────────

type PhosphorIcon = React.ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; color?: string }>;

const GOAL_ICONS: Record<string, PhosphorIcon> = {
  'target':     Target,
  'home':       House,
  'car':        Car,
  'travel':     Airplane,
  'education':  GraduationCap,
  'health':     FirstAid,
  'wedding':    Ring,
  'savings':    Money,
  'emergency':  ShieldCheck,
  'business':   Briefcase,
  'gadget':     DeviceMobile,
  'gift':       Gift,
  'book':       BookOpen,
  'run':        PersonRunning,
  'laptop':     Laptop,
  'bike':       Bicycle,
  'brain':      Brain,
  'barbell':    Barbell,
};

const GOAL_ICON_KEYS = Object.keys(GOAL_ICONS);

function GoalIcon({ name, size = 20, color, weight = 'regular' }: { name: string; size?: number; color?: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }) {
  const Icon = GOAL_ICONS[name] ?? Target;
  return <Icon size={size} color={color} weight={weight} />;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#5b6cf9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const REWARD_EMOJIS = ['🎁','👟','🚴','📱','👜','🎮','✈️','🏆','🍕','🎬','📚','💎','🛵','⌚','🎸','🎧'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmtRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysRemaining(targetDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(targetDate).getTime() - today.getTime()) / 86400000);
}

function onTrackStatus(goal: Goal): 'on_track' | 'behind' | 'none' {
  if (!goal.target_date) return 'none';
  const created = new Date(goal.created_at);
  const end = new Date(goal.target_date);
  const today = new Date();
  const totalDays = Math.max(1, (end.getTime() - created.getTime()) / 86400000);
  const elapsed = Math.max(0, (today.getTime() - created.getTime()) / 86400000);
  const timeRatio = elapsed / totalDays;
  const target = goal.goal_type === 'activity' ? (goal.target_value ?? 1) : goal.target_amount_minor;
  const current = goal.current_amount_minor;
  const progressRatio = target > 0 ? current / target : 0;
  return progressRatio >= timeRatio ? 'on_track' : 'behind';
}

// ── AddGoalSheet ──────────────────────────────────────────────────────────────

function AddGoalSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createGoal = useCreateGoal();
  const [goalType, setGoalType] = React.useState<'money' | 'activity'>('money');
  const [title, setTitle] = React.useState('');
  const [targetPaise, setTargetPaise] = React.useState<bigint>(BigInt(0));
  const [targetValue, setTargetValue] = React.useState('');
  const [unitLabel, setUnitLabel] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('target');
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[1]);
  // Reward
  const [rewardTitle, setRewardTitle] = React.useState('');
  const [rewardEmoji, setRewardEmoji] = React.useState('');
  // Reminder
  const [reminderDate, setReminderDate] = React.useState('');
  const [reminderTime, setReminderTime] = React.useState('09:00');
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setGoalType('money'); setTitle(''); setTargetPaise(BigInt(0));
    setTargetValue(''); setUnitLabel(''); setTargetDate('');
    setSelectedIcon('target'); setSelectedColor(PRESET_COLORS[1]);
    setRewardTitle(''); setRewardEmoji('');
    setReminderDate(''); setReminderTime('09:00');
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
      await createGoal.mutateAsync({
        title: title.trim(),
        goal_type: goalType,
        target_amount_minor: goalType === 'money' ? Number(targetPaise) : 0,
        target_value: goalType === 'activity' ? Number(targetValue) : undefined,
        unit_label: goalType === 'activity' ? unitLabel.trim() : undefined,
        target_date: targetDate || undefined,
        icon: selectedIcon,
        color: selectedColor,
        reward_title: rewardTitle.trim() || undefined,
        reward_emoji: rewardEmoji || undefined,
        reminder_date: reminderDate || undefined,
        reminder_time: reminderDate ? reminderTime : undefined,
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
        className="absolute right-0 top-0 h-full w-[460px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>New Goal</h2>
          <button onClick={handleClose} className="rounded-md p-1.5" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-5">
          {/* Goal type */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['money', 'activity'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setGoalType(t)}
                className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{ background: goalType === t ? 'var(--primary)' : 'var(--muted)', color: goalType === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}
              >
                {t === 'money' ? <Money size={15} /> : <Lightning size={15} />}
                {t === 'money' ? 'Money Goal' : 'Activity Goal'}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Goal Title</label>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder={goalType === 'money' ? 'e.g. Buy a bike' : 'e.g. Complete AZ-900'}
              value={title} onChange={(e) => setTitle(e.target.value)} required
            />
          </div>

          {/* Target */}
          {goalType === 'money' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Target Amount</label>
              <MoneyInput valuePaise={targetPaise} onChange={setTargetPaise} placeholder="₹0" />
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Target</label>
                <input type="number" min="1" className="rounded-lg border px-3 py-2 text-sm"
                  style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="30" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Unit</label>
                <input className="rounded-lg border px-3 py-2 text-sm"
                  style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="lessons, km, books…" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} required />
              </div>
            </div>
          )}

          {/* Deadline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Deadline <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="date" className="rounded-lg border px-3 py-2 text-sm w-48"
              style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          {/* Reward */}
          <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Trophy size={15} color="var(--warning)" weight="fill" />
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Reward when completed</label>
            </div>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder="e.g. New running shoes, Weekend trip"
              value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)}
            />
            {/* Reward emoji picker */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {REWARD_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setRewardEmoji(rewardEmoji === emoji ? '' : emoji)}
                  className="h-8 w-8 rounded-lg text-base flex items-center justify-center transition-all"
                  style={{
                    background: rewardEmoji === emoji ? 'var(--primary)' + '22' : 'var(--card)',
                    border: rewardEmoji === emoji ? `2px solid var(--primary)` : '2px solid transparent',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bell size={15} color="var(--info)" weight="fill" />
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Reminder</label>
            </div>
            <div className="flex gap-3">
              <input type="date" className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
              {reminderDate && (
                <input type="time" className="rounded-lg border px-3 py-2 text-sm w-32"
                  style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
              )}
            </div>
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Icon</label>
            <div className="grid grid-cols-9 gap-1.5">
              {GOAL_ICON_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => setSelectedIcon(key)} title={key}
                  className="h-9 w-9 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: selectedIcon === key ? selectedColor + '33' : 'var(--muted)',
                    border: selectedIcon === key ? `2px solid ${selectedColor}` : '2px solid transparent',
                    color: selectedIcon === key ? selectedColor : 'var(--muted-foreground)',
                  }}
                >
                  <GoalIcon name={key} size={16} color={selectedIcon === key ? selectedColor : undefined} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setSelectedColor(color)}
                  className="h-8 w-8 rounded-full transition-all"
                  style={{ background: color, outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="flex-1 rounded-lg py-2 text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || !isValid}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}>
              {submitting ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── UpdateProgressSheet (activity goals) ─────────────────────────────────────

function UpdateProgressSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const addDeposit = useAddDeposit();
  const [increment, setIncrement] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => { setIncrement(''); setNote(''); }, [goal?.id]);

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
      await addDeposit.mutateAsync({ goal_id: goal.id, amount_minor: val, note: note.trim() || undefined, deposit_date: todayStr() });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[380px] flex flex-col shadow-2xl"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Update Progress</h2>
          <button onClick={onClose} className="rounded-md p-1.5" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <div className="flex-1 flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <StatRing value={pct} size={80} strokeWidth={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{pct}%</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{goal.title}</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{currentVal} / {targetVal} {goal.unit_label}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Add progress ({goal.unit_label})</label>
              <input type="number" min="1"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                placeholder={`How many ${goal.unit_label}?`}
                value={increment} onChange={(e) => setIncrement(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Note <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input className="rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button type="submit" disabled={submitting || !increment || Number(increment) <= 0}
              className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}>
              {submitting ? 'Saving…' : 'Update Progress'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── GoalDetailSheet (money goals) ─────────────────────────────────────────────

function GoalDetailSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const addDeposit = useAddDeposit();
  const depositsQuery = useGoalDeposits(goal?.id ?? '');
  const deposits = depositsQuery.data ?? [];
  const [depositPaise, setDepositPaise] = React.useState<bigint>(BigInt(0));
  const [note, setNote] = React.useState('');
  const [depositDate, setDepositDate] = React.useState(todayStr());
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => { setDepositPaise(BigInt(0)); setNote(''); setDepositDate(todayStr()); }, [goal?.id]);

  if (!goal) return null;

  const pct = goal.target_amount_minor > 0
    ? Math.min(100, Math.round((goal.current_amount_minor / goal.target_amount_minor) * 100))
    : 0;
  const isCompleted = pct >= 100;
  const daysLeft = goal.target_date ? daysRemaining(goal.target_date) : null;

  const sortedAsc = [...deposits].sort((a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime());
  let running = 0;
  const chartData = sortedAsc.map((d) => { running += d.amount_minor; return { date: d.deposit_date.slice(5), amount: running / 100 }; });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositPaise <= 0) return;
    setSubmitting(true);
    try {
      await addDeposit.mutateAsync({ goal_id: goal.id, amount_minor: Number(depositPaise), note: note.trim() || undefined, deposit_date: depositDate });
      setDepositPaise(BigInt(0)); setNote(''); setDepositDate(todayStr());
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[520px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--foreground)' }}>
            <GoalIcon name={goal.icon} size={20} color={goal.color} weight="fill" />
            {goal.title}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>

        <div className="flex-1 flex flex-col gap-6 p-5">
          {/* Completed reward banner */}
          {isCompleted && goal.reward_title && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="text-2xl">{goal.reward_emoji ?? '🎁'}</span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>Goal Completed!</p>
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Reward: {goal.reward_title}</p>
              </div>
              <Trophy size={24} color="var(--success)" weight="fill" className="ml-auto" />
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <StatRing value={pct} size={120} strokeWidth={12} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{pct}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Saved</p>
                <MoneyDisplay paise={BigInt(goal.current_amount_minor)} className="text-2xl font-bold" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Target</p>
                <MoneyDisplay paise={BigInt(goal.target_amount_minor)} className="text-lg font-semibold" />
              </div>
              {daysLeft !== null && (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? 'Due today!' : `${Math.abs(daysLeft)} days overdue`}
                </p>
              )}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Progress Timeline</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Total saved']} />
                  <Line type="monotone" dataKey="amount" stroke={goal.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Add deposit */}
          <div className="rounded-xl p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Add Deposit</p>
            <form onSubmit={handleDeposit} className="flex flex-col gap-3">
              <MoneyInput valuePaise={depositPaise} onChange={setDepositPaise} placeholder="₹0" />
              <input className="rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <input type="date" className="rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
              <button type="submit" disabled={submitting || depositPaise <= 0}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--primary)' }}>
                {submitting ? 'Adding…' : 'Add Deposit'}
              </button>
            </form>
          </div>

          {/* Deposit history */}
          {deposits.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Deposit History</p>
              <div className="space-y-2">
                {[...deposits].sort((a, b) => new Date(b.deposit_date).getTime() - new Date(a.deposit_date).getTime()).map((d) => (
                  <div key={d.id} className="flex items-start gap-3 rounded-lg p-3" style={{ background: 'var(--muted)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{d.deposit_date}</p>
                      {d.note && <p className="text-xs mt-0.5" style={{ color: 'var(--foreground)' }}>{d.note}</p>}
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--foreground)' }}>{fmtRupees(d.amount_minor)}</p>
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

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({ goal, onClick, onDelete }: { goal: Goal; onClick: () => void; onDelete: () => void }) {
  const isActivity = goal.goal_type === 'activity';
  const target = isActivity ? (goal.target_value ?? 1) : goal.target_amount_minor;
  const current = goal.current_amount_minor;
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isCompleted = pct >= 100;
  const daysLeft = goal.target_date ? daysRemaining(goal.target_date) : null;
  const status = onTrackStatus(goal);
  const ringColor = isCompleted ? 'var(--success)' : pct > 60 ? 'var(--primary)' : pct > 30 ? 'var(--warning)' : 'var(--destructive)';

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 cursor-pointer transition-all"
      style={{
        background: isCompleted ? `${goal.color}08` : 'var(--card)',
        border: `1px solid ${isCompleted ? goal.color + '66' : 'var(--border)'}`,
        borderTop: `4px solid ${goal.color}`,
        boxShadow: 'var(--card-shadow)',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg p-1.5 flex-shrink-0" style={{ background: goal.color + '22', color: goal.color }}>
            <GoalIcon name={goal.icon} size={16} color={goal.color} weight="fill" />
          </div>
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{goal.title}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded-md p-1 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
          <Trash size={14} />
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <StatRing value={pct} size={72} strokeWidth={7} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: ringColor }}>{pct}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {isActivity ? (
            <>
              <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{current} <span className="text-sm font-normal" style={{ color: 'var(--muted-foreground)' }}>/ {goal.target_value} {goal.unit_label}</span></p>
            </>
          ) : (
            <>
              <MoneyDisplay paise={BigInt(current)} className="text-base font-bold" />
              <MoneyDisplay paise={BigInt(goal.target_amount_minor)} className="text-xs" />
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {daysLeft !== null && daysLeft >= 0 && (
          <span className="text-[11px] rounded-full px-2 py-0.5 flex items-center gap-1"
            style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            <CalendarBlank size={10} /> {daysLeft}d left
          </span>
        )}
        {status === 'on_track' && !isCompleted && (
          <span className="text-[11px] rounded-full px-2 py-0.5 font-medium flex items-center gap-1"
            style={{ background: '#10b98122', color: 'var(--success)' }}>
            <TrendUp size={10} /> On Track
          </span>
        )}
        {status === 'behind' && !isCompleted && (
          <span className="text-[11px] rounded-full px-2 py-0.5 font-medium"
            style={{ background: '#f59e0b22', color: 'var(--warning)' }}>
            Behind
          </span>
        )}
        {isCompleted && (
          <span className="text-[11px] rounded-full px-2 py-0.5 font-medium flex items-center gap-1"
            style={{ background: '#10b98122', color: 'var(--success)' }}>
            <Trophy size={10} weight="fill" /> Done!
          </span>
        )}
        {goal.reward_title && (
          <span className="text-[11px] rounded-full px-2 py-0.5 flex items-center gap-1"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
            {goal.reward_emoji ?? '🎁'} {goal.reward_title}
          </span>
        )}
        {goal.reminder_date && (
          <span className="text-[11px] rounded-full px-2 py-0.5 flex items-center gap-1"
            style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            <Bell size={10} /> {goal.reminder_date}
          </span>
        )}
      </div>

      {isActivity && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          style={{ background: goal.color + '22', color: goal.color, border: `1px solid ${goal.color}44` }}
        >
          <Plus size={13} /> Update Progress
        </button>
      )}
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
      <button onClick={() => setAddSheetOpen(true)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}>
        <Plus size={15} weight="bold" /> Add Goal
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  if (goalsQuery.isLoading) {
    return <div className="p-6 space-y-3">{[1,2,3].map((i) => <LoadingShimmer key={i} variant="card" />)}</div>;
  }

  if (goals.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Target size={40} weight="thin" />}
          title="No goals yet"
          description="Set a savings goal, earn a reward, track your progress."
          action={
            <button onClick={() => setAddSheetOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}>
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
      {moneyGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Money size={14} /> Money Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moneyGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal}
                onClick={() => setSelectedMoneyGoal(goal)}
                onDelete={() => setDeleteTarget(goal)} />
            ))}
          </div>
        </section>
      )}

      {activityGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Lightning size={14} /> Activity Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activityGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal}
                onClick={() => setSelectedActivityGoal(goal)}
                onDelete={() => setDeleteTarget(goal)} />
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Goal"
        description={`Delete "${deleteTarget?.title}"? All deposits will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) softDelete.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />

      <AddGoalSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />
      <GoalDetailSheet goal={selectedMoneyGoal} onClose={() => setSelectedMoneyGoal(null)} />
      <UpdateProgressSheet goal={selectedActivityGoal} onClose={() => setSelectedActivityGoal(null)} />
    </div>
  );
}
