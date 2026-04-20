'use client';

import * as React from 'react';
import {
  CheckCircle,
  Circle,
  Fire,
  Plus,
  Trash,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  DotsThreeVertical,
  SkipForward,
  PencilSimple,
  // Icon picker set
  BookOpen,
  Coffee,
  Barbell,
  Heart,
  Moon,
  MusicNotes,
  Pencil,
  PersonRunning,
  Smiley,
  Sun,
  Target,
  Drop,
  Lightning,
  Apple,
  Bicycle,
  Brain,
  Leaf,
  FirstAid,
  Pill,
  Star,
  Bed,
  ForkKnife,
  ShieldCheck,
  Laptop,
  Footprints,
} from '@phosphor-icons/react';
import { LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import type { Habit, HabitCheckin } from '@pokimate/shared';
import { useHabits, useCreateHabit, useSoftDeleteHabit } from '@/hooks/useHabits';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { invokeWithToast } from '@/lib/tauri';

// ── Icon system (Phosphor SVG — no emoji) ─────────────────────────────────────

type PhosphorIcon = React.ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; color?: string; className?: string }>;

const HABIT_ICONS: Record<string, PhosphorIcon> = {
  'check-circle':  CheckCircle,
  'book':          BookOpen,
  'coffee':        Coffee,
  'dumbbell':      Barbell,
  'heart':         Heart,
  'moon':          Moon,
  'music':         MusicNotes,
  'pencil':        Pencil,
  'run':           PersonRunning,
  'smile':         Smiley,
  'sun':           Sun,
  'target':        Target,
  'water':         Drop,
  'zap':           Lightning,
  'apple':         Apple,
  'bike':          Bicycle,
  'brain':         Brain,
  'flame':         Fire,
  'leaf':          Leaf,
  'medkit':        FirstAid,
  'pill':          Pill,
  'sleep':         Bed,
  'star':          Star,
  'food':          ForkKnife,
  'shield':        ShieldCheck,
  'laptop':        Laptop,
  'walk':          Footprints,
};

const ICON_KEYS = Object.keys(HABIT_ICONS);

function HabitIcon({ name, size = 20, color, weight = 'regular' }: { name: string; size?: number; color?: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }) {
  const Icon = HABIT_ICONS[name] ?? CheckCircle;
  return <Icon size={size} color={color} weight={weight} />;
}

const PRESET_COLORS = [
  '#5b6cf9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function computeStreak(checkins: HabitCheckin[], habitId: string): number {
  const today = todayStr();
  const doneSet = new Set(
    checkins.filter((c) => c.habit_id === habitId && c.status === 'done').map((c) => c.checkin_date)
  );
  let streak = 0;
  let cursor = new Date(today);
  if (doneSet.has(today)) streak++;
  cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (!doneSet.has(ds)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getCardBorderColor(checkins: HabitCheckin[], habitId: string): string {
  const today = todayStr();
  const todayCheckin = checkins.find((c) => c.habit_id === habitId && c.checkin_date === today);
  if (todayCheckin?.status === 'done') return '#10b981';
  if (todayCheckin?.status === 'skip') return '#f59e0b';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().slice(0, 10);
  const ydCheckin = checkins.find((c) => c.habit_id === habitId && c.checkin_date === yd);
  if (ydCheckin?.status === 'missed') return '#ef4444';
  return 'var(--border)';
}

// ── AddHabitSheet ─────────────────────────────────────────────────────────────

interface AddHabitSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editHabit?: Habit | null;
}

function AddHabitSheet({ open, onOpenChange, editHabit }: AddHabitSheetProps) {
  const createMutation = useCreateHabit();
  const [name, setName] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('check-circle');
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[0]);
  const [frequency, setFrequency] = React.useState<'daily' | 'weekly'>('daily');
  const [targetDays, setTargetDays] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [reminderTime, setReminderTime] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editHabit) {
      setName(editHabit.name);
      setSelectedIcon(editHabit.icon);
      setSelectedColor(editHabit.color);
      setFrequency((editHabit.frequency as 'daily' | 'weekly') ?? 'daily');
      try { setTargetDays(JSON.parse(editHabit.target_days)); }
      catch { setTargetDays([0, 1, 2, 3, 4, 5, 6]); }
      setReminderTime(editHabit.reminder_time ?? '');
    } else {
      setName(''); setSelectedIcon('check-circle'); setSelectedColor(PRESET_COLORS[0]);
      setFrequency('daily'); setTargetDays([0, 1, 2, 3, 4, 5, 6]); setReminderTime('');
    }
  }, [editHabit, open]);

  const toggleDay = (day: number) => {
    setTargetDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        name: name.trim(), frequency,
        target_days: JSON.stringify(targetDays),
        color: selectedColor, icon: selectedIcon,
        reminder_time: reminderTime || undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div
        className="absolute right-0 top-0 h-full w-[440px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            {editHabit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1.5" style={{ color: 'var(--muted-foreground)' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Habit Name</label>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder="e.g. Morning workout"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Icon picker — actual SVG icons */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Icon</label>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedIcon(key)}
                  title={key}
                  className="h-10 w-10 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: selectedIcon === key ? selectedColor + '33' : 'var(--muted)',
                    border: selectedIcon === key ? `2px solid ${selectedColor}` : '2px solid transparent',
                    color: selectedIcon === key ? selectedColor : 'var(--muted-foreground)',
                  }}
                >
                  <HabitIcon name={key} size={18} color={selectedIcon === key ? selectedColor : undefined} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Color</label>
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

          {/* Frequency */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: frequency === f ? 'var(--primary)' : 'var(--muted)',
                    color: frequency === f ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Target days */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Target Days</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: targetDays.includes(idx) ? selectedColor : 'var(--muted)',
                    color: targetDays.includes(idx) ? '#fff' : 'var(--muted-foreground)',
                  }}
                >
                  {label.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Reminder Time <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="time"
              className="rounded-lg border px-3 py-2 text-sm w-36"
              style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <div className="mt-auto flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg py-2 text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {submitting ? 'Saving…' : editHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Monthly heatmap ───────────────────────────────────────────────────────────

interface HeatmapProps {
  year: number;
  month: number;
  checkins: HabitCheckin[];
  habits: Habit[];
}

function MonthlyHeatmap({ year, month, checkins, habits }: HeatmapProps) {
  const [tooltip, setTooltip] = React.useState<{ text: string; x: number; y: number } | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getCellColor = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCheckins = checkins.filter((c) => c.checkin_date === ds);
    if (dayCheckins.length === 0 || habits.length === 0) return 'var(--muted)';
    const done = dayCheckins.filter((c) => c.status === 'done').length;
    const rate = done / habits.length;
    if (rate >= 0.9) return 'var(--success)';
    if (rate >= 0.5) return 'color-mix(in srgb, var(--success) 60%, transparent)';
    return 'color-mix(in srgb, var(--success) 30%, transparent)';
  };

  return (
    <div className="relative">
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{d.slice(0,1)}</div>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) =>
          day === null ? <div key={`e-${i}`} /> : (
            <div
              key={day}
              className="aspect-square rounded-sm cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: getCellColor(day), minHeight: 12 }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const done = checkins.filter((c) => c.checkin_date === ds && c.status === 'done').length;
                setTooltip({ text: `${ds}: ${done}/${habits.length} done`, x: rect.left, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        )}
      </div>
      {tooltip && (
        <div
          className="fixed z-50 rounded-md px-2 py-1 text-xs text-white pointer-events-none"
          style={{ background: 'var(--foreground)', top: tooltip.y - 32, left: tooltip.x }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────

function HabitContextMenu({ x, y, onSkip, onEdit, onDelete, onClose }: {
  x: number; y: number;
  onSkip: () => void; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  React.useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded-xl shadow-xl border py-1 min-w-[160px]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => { onSkip(); onClose(); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-muted rounded-md mx-1" style={{ color: 'var(--muted-foreground)', width: 'calc(100% - 8px)' }}>
        <SkipForward size={14} /> Skip Today
      </button>
      <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-muted rounded-md mx-1" style={{ color: 'var(--foreground)', width: 'calc(100% - 8px)' }}>
        <PencilSimple size={14} /> Edit
      </button>
      <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
      <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-muted rounded-md mx-1" style={{ color: 'var(--destructive)', width: 'calc(100% - 8px)' }}>
        <Trash size={14} /> Delete
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  const { setActions } = useTopbarActions();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editHabit, setEditHabit] = React.useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Habit | null>(null);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; habit: Habit } | null>(null);
  const [pendingCheckins, setPendingCheckins] = React.useState<Set<string>>(new Set());

  const now = new Date();
  const [heatmapYear, setHeatmapYear] = React.useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = React.useState(now.getMonth());

  const { from, to } = monthRange(heatmapYear, heatmapMonth);
  const today = todayStr();

  const habitsQuery = useHabits();
  const habits = habitsQuery.data ?? [];
  const softDelete = useSoftDeleteHabit();

  const [todayCheckins, setTodayCheckins] = React.useState<HabitCheckin[]>([]);
  const [monthCheckins, setMonthCheckins] = React.useState<HabitCheckin[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refreshToday = React.useCallback(() => {
    if (!userId) return;
    invokeWithToast<HabitCheckin[]>('habits_list_checkins', { habit_id: '', user_id: userId, from_date: today, to_date: today })
      .then(setTodayCheckins).catch(() => {});
  }, [userId, today]);

  React.useEffect(() => { refreshToday(); }, [refreshToday, sheetOpen, refreshKey]);

  React.useEffect(() => {
    if (!userId) return;
    invokeWithToast<HabitCheckin[]>('habits_list_checkins', { habit_id: '', user_id: userId, from_date: from, to_date: to })
      .then(setMonthCheckins).catch(() => {});
  }, [userId, from, to, refreshKey]);

  const handleCheckin = React.useCallback(async (habit: Habit, currentStatus: string | undefined) => {
    const newStatus: 'done' | 'missed' = currentStatus === 'done' ? 'missed' : 'done';
    setPendingCheckins((s) => new Set(s).add(habit.id));

    // Optimistic update
    setTodayCheckins((prev) => {
      const filtered = prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today));
      return [...filtered, { id: '', habit_id: habit.id, user_id: userId, checkin_date: today, status: newStatus, note: null, created_at: new Date().toISOString() }];
    });

    try {
      await invokeWithToast('habits_upsert_checkin', { user_id: userId, habit_id: habit.id, checkin_date: today, status: newStatus });
      setRefreshKey((k) => k + 1);
    } catch {
      setTodayCheckins((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today && c.id === '')));
    } finally {
      setPendingCheckins((s) => { const next = new Set(s); next.delete(habit.id); return next; });
    }
  }, [today, userId]);

  const handleSkip = React.useCallback(async (habit: Habit) => {
    setTodayCheckins((prev) => {
      const filtered = prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today));
      return [...filtered, { id: '', habit_id: habit.id, user_id: userId, checkin_date: today, status: 'skip', note: null, created_at: '' }];
    });
    try {
      await invokeWithToast('habits_upsert_checkin', { user_id: userId, habit_id: habit.id, checkin_date: today, status: 'skip' });
      setRefreshKey((k) => k + 1);
    } catch {
      setTodayCheckins((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today && c.id === '')));
    }
  }, [today, userId]);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => { setEditHabit(null); setSheetOpen(true); }}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={15} weight="bold" /> Add Habit
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  if (habitsQuery.isLoading) {
    return <div className="p-6 space-y-3">{[1,2,3].map((i) => <LoadingShimmer key={i} variant="card" />)}</div>;
  }

  const allCheckins = [...todayCheckins, ...monthCheckins];
  const thisMonthDone = monthCheckins.filter((c) => c.status === 'done').length;
  const totalPossible = habits.length * new Date(heatmapYear, heatmapMonth + 1, 0).getDate();
  const completionPct = totalPossible > 0 ? Math.round((thisMonthDone / totalPossible) * 100) : 0;
  const longestStreak = habits.length > 0 ? Math.max(...habits.map((h) => computeStreak(allCheckins, h.id))) : 0;
  const doneToday = todayCheckins.filter((c) => c.status === 'done').length;

  return (
    <div className="p-6 space-y-6">
      {habits.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} weight="thin" />}
          title="No habits yet"
          description="Start small. One habit at a time."
          action={
            <button
              onClick={() => { setEditHabit(null); setSheetOpen(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              Add your first habit
            </button>
          }
        />
      ) : (
        <>
          {/* Today header with progress */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>Today</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {doneToday}/{habits.length} completed
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${habits.length > 0 ? (doneToday / habits.length) * 100 : 0}%`, background: 'var(--success)' }}
              />
            </div>
          </div>

          {/* Habit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {habits.map((habit) => {
              const todayCheckin = todayCheckins.find((c) => c.habit_id === habit.id && c.checkin_date === today);
              const isDone = todayCheckin?.status === 'done';
              const isSkipped = todayCheckin?.status === 'skip';
              const isPending = pendingCheckins.has(habit.id);
              const streak = computeStreak(allCheckins, habit.id);
              const borderColor = getCardBorderColor(todayCheckins, habit.id);

              return (
                <div
                  key={habit.id}
                  className="rounded-xl p-4 flex items-center gap-3 transition-all"
                  style={{
                    background: isDone ? `${habit.color}0d` : 'var(--card)',
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: 'var(--card-shadow)',
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, habit }); }}
                >
                  {/* Habit icon */}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: habit.color + '22', color: habit.color }}
                  >
                    <HabitIcon name={habit.icon} size={22} color={habit.color} weight={isDone ? 'fill' : 'regular'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{
                      color: isDone ? habit.color : 'var(--foreground)',
                      textDecoration: isSkipped ? 'line-through' : 'none',
                    }}>
                      {habit.name}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      {streak >= 3 ? <Fire size={12} color="#f59e0b" weight="fill" /> : null}
                      {streak > 0 ? `${streak} day streak` : isSkipped ? 'Skipped today' : 'No streak yet'}
                    </p>
                  </div>

                  {/* Mark done button — large, clear, satisfying */}
                  <button
                    onClick={() => !isPending && handleCheckin(habit, todayCheckin?.status)}
                    disabled={isPending}
                    className="flex-shrink-0 transition-all disabled:opacity-60"
                    title={isDone ? 'Unmark' : 'Mark as done'}
                    style={{ transform: isPending ? 'scale(0.9)' : 'scale(1)' }}
                  >
                    {isDone ? (
                      <CheckCircle size={32} color={habit.color} weight="fill" />
                    ) : (
                      <Circle size={32} color="var(--border)" weight="regular" />
                    )}
                  </button>

                  {/* More options */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, habit }); }}
                    className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <DotsThreeVertical size={16} weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Heatmap */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Monthly Overview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear((y) => y - 1); } else setHeatmapMonth((m) => m - 1); }}
                  className="rounded-md p-1"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <CaretLeft size={16} weight="bold" />
                </button>
                <span className="text-sm font-medium w-24 text-center" style={{ color: 'var(--foreground)' }}>
                  {MONTH_NAMES[heatmapMonth]} {heatmapYear}
                </span>
                <button
                  onClick={() => { if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear((y) => y + 1); } else setHeatmapMonth((m) => m + 1); }}
                  className="rounded-md p-1"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <CaretRight size={16} weight="bold" />
                </button>
              </div>
            </div>
            <MonthlyHeatmap year={heatmapYear} month={heatmapMonth} checkins={monthCheckins} habits={habits} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'This month', value: `${completionPct}%`, sub: 'completion rate' },
              { label: 'Best streak', value: `${longestStreak}d`, sub: 'consecutive days' },
              { label: 'Done today', value: `${doneToday}/${habits.length}`, sub: 'habits' },
              { label: 'Check-ins', value: String(thisMonthDone), sub: 'this month' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <HabitContextMenu
          x={contextMenu.x} y={contextMenu.y} habit={contextMenu.habit}
          onSkip={() => handleSkip(contextMenu.habit)}
          onEdit={() => { setEditHabit(contextMenu.habit); setSheetOpen(true); }}
          onDelete={() => setDeleteTarget(contextMenu.habit)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Habit"
        description={`Delete "${deleteTarget?.name}"? All check-in history will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) softDelete.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />

      {/* Add/Edit sheet */}
      <AddHabitSheet open={sheetOpen} onOpenChange={setSheetOpen} editHabit={editHabit} />
    </div>
  );
}
