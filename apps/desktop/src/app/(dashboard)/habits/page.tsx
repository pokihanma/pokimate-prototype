'use client';

import * as React from 'react';
import {
  CheckSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  MoreVertical,
  Trash2,
  SkipForward,
  Pencil,
} from 'lucide-react';
import { LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import type { Habit, HabitCheckin } from '@pokimate/shared';
import {
  useHabits,
  useCreateHabit,
  useSoftDeleteHabit,
} from '@/hooks/useHabits';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { invokeWithToast } from '@/lib/tauri';

// ── Icon picker data ──────────────────────────────────────────────────────────

const LUCIDE_ICON_NAMES = [
  'check-circle', 'activity', 'book', 'coffee', 'dumbbell', 'heart',
  'moon', 'music', 'pencil', 'run', 'smile', 'sun',
  'target', 'water', 'zap', 'apple', 'bike', 'brain',
  'flame', 'leaf', 'medkit', 'pill', 'sleep', 'star',
];

const ICON_EMOJI_MAP: Record<string, string> = {
  'check-circle': '✅', 'activity': '📈', 'book': '📚', 'coffee': '☕',
  'dumbbell': '🏋️', 'heart': '❤️', 'moon': '🌙', 'music': '🎵',
  'pencil': '✏️', 'run': '🏃', 'smile': '😊', 'sun': '☀️',
  'target': '🎯', 'water': '💧', 'zap': '⚡', 'apple': '🍎',
  'bike': '🚴', 'brain': '🧠', 'flame': '🔥', 'leaf': '🌿',
  'medkit': '🩺', 'pill': '💊', 'sleep': '😴', 'star': '⭐',
  // extended map for seed data icons
  'footprints': '🚶', 'book-open': '📖', 'walk': '🚶', 'meditate': '🧘',
  'shield': '🛡️', 'laptop': '💻', 'plane': '✈️', 'droplets': '💧',
  'utensils': '🍽️', 'ban': '🚫', 'weight': '⚖️', 'barbell': '🏋️',
};

const PRESET_COLORS = [
  '#5b6cf9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    checkins
      .filter((c) => c.habit_id === habitId && c.status === 'done')
      .map((c) => c.checkin_date)
  );
  let streak = 0;
  let cursor = new Date(today);
  // include today if done
  if (doneSet.has(today)) streak++;
  // go backwards from yesterday
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
  if (todayCheckin?.status === 'done') return '#10b981';  // green
  if (todayCheckin?.status === 'skip') return '#f59e0b';  // amber
  // Check if yesterday was missed (habit exists and no done checkin)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().slice(0, 10);
  const ydCheckin = checkins.find((c) => c.habit_id === habitId && c.checkin_date === yd);
  if (ydCheckin?.status === 'missed') return '#ef4444';   // red = explicitly missed
  return 'var(--border)';                                  // gray = pending
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
      setName('');
      setSelectedIcon('check-circle');
      setSelectedColor(PRESET_COLORS[0]);
      setFrequency('daily');
      setTargetDays([0, 1, 2, 3, 4, 5, 6]);
      setReminderTime('');
    }
  }, [editHabit, open]);

  const toggleDay = (day: number) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        frequency,
        target_days: JSON.stringify(targetDays),
        color: selectedColor,
        icon: selectedIcon,
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
        className="absolute right-0 top-0 h-full w-[420px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{editHabit ? 'Edit Habit' : 'New Habit'}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Habit Name</label>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Morning workout"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {LUCIDE_ICON_NAMES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className="h-9 w-9 rounded-md text-lg flex items-center justify-center transition-all"
                  style={{
                    background: selectedIcon === icon ? selectedColor + '33' : 'var(--muted)',
                    border: selectedIcon === icon ? `2px solid ${selectedColor}` : '2px solid transparent',
                  }}
                  title={icon}
                >
                  {ICON_EMOJI_MAP[icon] ?? '•'}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: frequency === f ? 'var(--primary)' : 'var(--muted)',
                    color: frequency === f ? 'var(--primary-foreground)' : 'var(--foreground)',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: targetDays.includes(idx) ? selectedColor : 'var(--muted)',
                    color: targetDays.includes(idx) ? '#fff' : 'var(--muted-foreground)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reminder Time (optional)</label>
            <input
              type="time"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-md py-2 text-sm font-medium border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
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
  const [tooltip, setTooltip] = React.useState<{ date: string; x: number; y: number } | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getCellColor = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCheckins = checkins.filter((c) => c.checkin_date === dateStr);
    if (dayCheckins.length === 0 || habits.length === 0) return 'var(--bg-overlay)';
    const done = dayCheckins.filter((c) => c.status === 'done').length;
    const rate = done / habits.length;
    if (rate >= 0.9) return 'var(--success)';
    if (rate >= 0.5) return 'color-mix(in srgb, var(--success) 60%, transparent)';
    return 'color-mix(in srgb, var(--success) 30%, transparent)';
  };

  const getTooltipContent = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCheckins = checkins.filter((c) => c.checkin_date === dateStr && c.status === 'done');
    return `${dateStr}: ${dayCheckins.length}/${habits.length} completed`;
  };

  return (
    <div className="relative">
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground pb-1">{d}</div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div
              key={day}
              className="aspect-square rounded-sm cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: getCellColor(day), minHeight: 12 }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ date: getTooltipContent(day), x: rect.left, y: rect.top });
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
          {tooltip.date}
        </div>
      )}
    </div>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  habit: Habit;
  onSkip: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function HabitContextMenu({ x, y, onSkip, onEdit, onDelete, onClose }: ContextMenuProps) {
  React.useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded-lg shadow-lg border border-border py-1 min-w-[140px]"
      style={{ background: 'var(--card)', top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => { onSkip(); onClose(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
        <SkipForward size={14} /> Skip Today
      </button>
      <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
        <Pencil size={14} /> Edit
      </button>
      <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-destructive">
        <Trash2 size={14} /> Delete
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

  const now = new Date();
  const [heatmapYear, setHeatmapYear] = React.useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = React.useState(now.getMonth());

  const { from, to } = monthRange(heatmapYear, heatmapMonth);
  const today = todayStr();

  const habitsQuery = useHabits();
  const habits = habitsQuery.data ?? [];
  const softDelete = useSoftDeleteHabit();

  // Today's checkins — refreshed after each check-in action
  const [todayCheckins, setTodayCheckins] = React.useState<HabitCheckin[]>([]);
  const [monthCheckins, setMonthCheckins] = React.useState<HabitCheckin[]>([]);
  const [checkinRefreshKey, setCheckinRefreshKey] = React.useState(0);

  const refreshTodayCheckins = React.useCallback(() => {
    if (!userId) return;
    invokeWithToast<HabitCheckin[]>('habits_list_checkins', {
      habit_id: '',
      user_id: userId,
      from_date: today,
      to_date: today,
    }).then(setTodayCheckins).catch(() => {});
  }, [userId, today]);

  React.useEffect(() => {
    refreshTodayCheckins();
  }, [refreshTodayCheckins, sheetOpen, checkinRefreshKey]);

  React.useEffect(() => {
    if (!userId) return;
    invokeWithToast<HabitCheckin[]>('habits_list_checkins', {
      habit_id: '',
      user_id: userId,
      from_date: from,
      to_date: to,
    }).then(setMonthCheckins).catch(() => {});
  }, [userId, from, to, checkinRefreshKey]);

  // Instant checkin handler with optimistic UI update
  const handleCheckin = React.useCallback(async (habit: Habit, currentStatus: 'done' | 'skip' | 'missed' | undefined) => {
    const date = today;
    const newStatus: 'done' | 'missed' = currentStatus === 'done' ? 'missed' : 'done';

    // Optimistic update — green border appears instantly
    setTodayCheckins((prev) => {
      const filtered = prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === date));
      return [...filtered, {
        id: '',
        habit_id: habit.id,
        user_id: userId,
        checkin_date: date,
        status: newStatus,
        note: null,
        created_at: new Date().toISOString(),
      }];
    });

    try {
      await invokeWithToast('habits_upsert_checkin', {
        user_id: userId,
        habit_id: habit.id,
        checkin_date: date,
        status: newStatus,
      });
      // Refresh both today and month checkins after server confirms
      setCheckinRefreshKey((k) => k + 1);
    } catch {
      // Revert optimistic update on error
      setTodayCheckins((prev) =>
        prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === date && c.id === ''))
      );
    }
  }, [today, userId]);

  const handleSkip = React.useCallback(async (habit: Habit) => {
    setTodayCheckins((prev) => {
      const filtered = prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today));
      return [...filtered, { id: '', habit_id: habit.id, user_id: userId, checkin_date: today, status: 'skip', note: null, created_at: '' }];
    });
    try {
      await invokeWithToast('habits_upsert_checkin', {
        user_id: userId,
        habit_id: habit.id,
        checkin_date: today,
        status: 'skip',
      });
      setCheckinRefreshKey((k) => k + 1);
    } catch {
      setTodayCheckins((prev) => prev.filter((c) => !(c.habit_id === habit.id && c.checkin_date === today && c.id === '')));
    }
  }, [today, userId]);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => { setEditHabit(null); setSheetOpen(true); }}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={16} /> Add Habit
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  if (habitsQuery.isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <LoadingShimmer key={i} variant="card" />)}
      </div>
    );
  }

  // ── Stats ──
  const allCheckins = [...todayCheckins, ...monthCheckins];
  const thisMonthDone = monthCheckins.filter((c) => c.status === 'done').length;
  const totalPossible = habits.length * new Date(heatmapYear, heatmapMonth + 1, 0).getDate();
  const completionPct = totalPossible > 0 ? Math.round((thisMonthDone / totalPossible) * 100) : 0;

  const longestStreak = habits.length > 0
    ? Math.max(...habits.map((h) => computeStreak(allCheckins, h.id)))
    : 0;

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="p-6 space-y-6">
      {/* Today's habit cards */}
      {habits.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={40} className="text-muted-foreground" />}
          title="No habits yet"
          description="Build streaks and track your daily habits."
          action={
            <button
              onClick={() => { setEditHabit(null); setSheetOpen(true); }}
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              Add your first habit
            </button>
          }
        />
      ) : (
        <div>
          <h2 className="text-base font-semibold mb-3 text-foreground">Today</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => {
              const todayCheckin = todayCheckins.find((c) => c.habit_id === habit.id && c.checkin_date === today);
              const isDone = todayCheckin?.status === 'done';
              const streak = computeStreak(allCheckins, habit.id);
              const borderColor = getCardBorderColor(todayCheckins, habit.id);

              return (
                <div
                  key={habit.id}
                  className="rounded-xl p-4 flex items-center gap-4 transition-all"
                  style={{
                    background: 'var(--card)',
                    border: `2px solid ${borderColor}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, habit });
                  }}
                >
                  {/* Icon */}
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: habit.color + '22' }}
                  >
                    {ICON_EMOJI_MAP[habit.icon] ?? '✨'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{habit.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {streak > 0 ? (
                        <span>{streak >= 3 ? '🔥' : '🔆'} {streak} day streak</span>
                      ) : (
                        'No streak yet'
                      )}
                    </p>
                  </div>

                  {/* Check button — green when done, shows checkmark */}
                  <button
                    onClick={() => handleCheckin(habit, todayCheckin?.status)}
                    className="h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                    style={{
                      borderColor: isDone ? '#10b981' : 'var(--border)',
                      background: isDone ? '#10b981' : 'transparent',
                    }}
                    title={isDone ? 'Mark as not done' : 'Mark as done'}
                  >
                    {isDone && <Check size={16} color="#fff" />}
                  </button>

                  {/* Context menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, habit });
                    }}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted flex-shrink-0"
                  >
                    <MoreVertical size={15} className="text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {habits.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Monthly Heatmap</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear((y) => y - 1); }
                  else setHeatmapMonth((m) => m - 1);
                }}
                className="rounded-md p-1 hover:bg-muted"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium w-24 text-center">
                {MONTH_NAMES[heatmapMonth]} {heatmapYear}
              </span>
              <button
                onClick={() => {
                  if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear((y) => y + 1); }
                  else setHeatmapMonth((m) => m + 1);
                }}
                className="rounded-md p-1 hover:bg-muted"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <MonthlyHeatmap
            year={heatmapYear}
            month={heatmapMonth}
            checkins={monthCheckins}
            habits={habits}
          />
        </div>
      )}

      {/* Stats row */}
      {habits.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Completion this month', value: `${completionPct}%` },
            { label: 'Best streak (any habit)', value: `${longestStreak} days` },
            { label: 'Best streak (all-time)', value: `${longestStreak} days` },
            { label: 'Total check-ins', value: String(thisMonthDone) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 flex flex-col gap-1"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <HabitContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          habit={contextMenu.habit}
          onSkip={() => handleSkip(contextMenu.habit)}
          onEdit={() => { setEditHabit(contextMenu.habit); setSheetOpen(true); }}
          onDelete={() => setDeleteTarget(contextMenu.habit)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Habit"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) softDelete.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* Add/Edit sheet */}
      <AddHabitSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editHabit={editHabit}
      />
    </div>
  );
}
