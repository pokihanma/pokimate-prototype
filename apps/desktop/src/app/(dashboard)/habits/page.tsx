'use client';

import * as React from 'react';
import {
  CheckCircle, Circle, Fire, Plus, Trash, CaretLeft, CaretRight,
  DotsThreeVertical, SkipForward, PencilSimple, X,
  BookOpen, Coffee, Barbell, Heart, Moon, MusicNotes, Pencil,
  PersonSimpleRun, Smiley, Sun, Target, Drop, Lightning, Apple,
  Bicycle, Brain, Leaf, FirstAid, Pill, Star, Bed, ForkKnife,
  ShieldCheck, Laptop, Footprints, TrendUp, CalendarBlank,
} from '@phosphor-icons/react';
import { LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import type { Habit, HabitCheckin } from '@pokimate/shared';
import { useHabits, useCreateHabit, useSoftDeleteHabit } from '@/hooks/useHabits';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { invokeWithToast } from '@/lib/tauri';

// ── Icon system ───────────────────────────────────────────────────────────────

type PhosphorIcon = React.ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; color?: string; className?: string }>;

const HABIT_ICONS: Record<string, PhosphorIcon> = {
  'check-circle': CheckCircle, 'book': BookOpen, 'coffee': Coffee,
  'dumbbell': Barbell, 'heart': Heart, 'moon': Moon, 'music': MusicNotes,
  'pencil': Pencil, 'run': PersonSimpleRun, 'smile': Smiley, 'sun': Sun,
  'target': Target, 'water': Drop, 'zap': Lightning, 'apple': Apple,
  'bike': Bicycle, 'brain': Brain, 'flame': Fire, 'leaf': Leaf,
  'medkit': FirstAid, 'pill': Pill, 'sleep': Bed, 'star': Star,
  'food': ForkKnife, 'shield': ShieldCheck, 'laptop': Laptop, 'walk': Footprints,
};
const ICON_KEYS = Object.keys(HABIT_ICONS);

function HabitIcon({ name, size = 20, color, weight = 'regular' }: {
  name: string; size?: number; color?: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}) {
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

function todayStr() { return new Date().toISOString().slice(0, 10); }

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
  const cursor = new Date(today);
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

// hex color → rgba with opacity (works for both themes)
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Circular progress ring ────────────────────────────────────────────────────

function ProgressRing({ done, total, size = 88 }: { done: number; total: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--primary)" strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ── Monthly heatmap (interactive) ─────────────────────────────────────────────

interface HeatmapProps {
  year: number; month: number;
  checkins: HabitCheckin[]; habits: Habit[];
  selectedDay: string | null; onSelectDay: (ds: string | null) => void;
}

function MonthlyHeatmap({ year, month, checkins, habits, selectedDay, onSelectDay }: HeatmapProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = todayStr();

  const getCellData = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCheckins = checkins.filter((c) => c.checkin_date === ds);
    const done = dayCheckins.filter((c) => c.status === 'done').length;
    const skipped = dayCheckins.filter((c) => c.status === 'skip').length;
    const total = habits.length;
    const rate = total > 0 ? done / total : 0;
    return { ds, done, skipped, total, rate };
  };

  const getCellStyle = (day: number) => {
    const { ds, rate, done } = getCellData(day);
    const isFuture = ds > today;
    const isSelected = ds === selectedDay;
    const isToday = ds === today;

    if (isFuture || done === 0) return {
      background: 'var(--muted)',
      border: isToday ? '2px solid var(--primary)' : isSelected ? '2px solid var(--primary)' : '2px solid transparent',
    };
    const alpha = rate >= 0.9 ? 0.85 : rate >= 0.5 ? 0.55 : 0.28;
    return {
      background: `rgba(99,102,241,${alpha})`,
      border: isSelected ? '2px solid var(--primary)' : isToday ? '2px solid rgba(99,102,241,0.8)' : '2px solid transparent',
    };
  };

  return (
    <div>
      {/* Day headers */}
      <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium" style={{ color: 'var(--muted-foreground)' }}>{d.slice(0,1)}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) =>
          day === null ? <div key={`e-${i}`} /> : (
            <button
              key={day}
              type="button"
              className="aspect-square rounded-md transition-all hover:opacity-90 hover:scale-110 focus:outline-none"
              style={{ ...getCellStyle(day), minHeight: 20, cursor: 'pointer' }}
              onClick={() => {
                const { ds } = getCellData(day);
                onSelectDay(selectedDay === ds ? null : ds);
              }}
              title={(() => { const { ds, done, total } = getCellData(day); return `${ds}: ${done}/${total}`; })()}
            />
          )
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Less</span>
        {[0.15, 0.35, 0.6, 0.85].map((a) => (
          <div key={a} className="h-3.5 w-3.5 rounded-sm" style={{ background: `rgba(99,102,241,${a})` }} />
        ))}
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>More</span>
        <div className="flex items-center gap-1 ml-2">
          <div className="h-3.5 w-3.5 rounded-sm" style={{ background: 'var(--muted)', border: '1.5px solid var(--primary)' }} />
          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Today</span>
        </div>
      </div>
    </div>
  );
}

// ── Day detail panel (shown when a day is clicked) ────────────────────────────

function DayDetail({ ds, habits, checkins }: { ds: string; habits: Habit[]; checkins: HabitCheckin[] }) {
  const dayCheckins = checkins.filter((c) => c.checkin_date === ds);
  const label = (() => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  })();
  const done = dayCheckins.filter((c) => c.status === 'done').length;

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{done}/{habits.length} habits completed</p>
        </div>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: done === habits.length && habits.length > 0 ? 'rgba(16,185,129,0.15)' : 'var(--muted)',
            color: done === habits.length && habits.length > 0 ? '#10b981' : 'var(--muted-foreground)',
          }}
        >
          {habits.length > 0 ? Math.round((done / habits.length) * 100) : 0}%
        </div>
      </div>
      <div className="space-y-2">
        {habits.map((habit) => {
          const checkin = dayCheckins.find((c) => c.habit_id === habit.id);
          const status = checkin?.status ?? 'missed';
          const statusColor = status === 'done' ? '#10b981' : status === 'skip' ? '#f59e0b' : 'var(--muted-foreground)';
          const statusLabel = status === 'done' ? 'Done' : status === 'skip' ? 'Skipped' : 'Missed';
          return (
            <div key={habit.id} className="flex items-center gap-2.5">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: hexToRgba(habit.color, 0.15) }}
              >
                <HabitIcon name={habit.icon} size={13} color={habit.color} weight={status === 'done' ? 'fill' : 'regular'} />
              </div>
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--foreground)' }}>{habit.name}</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: status === 'done' ? 'rgba(16,185,129,0.12)' : status === 'skip' ? 'rgba(245,158,11,0.12)' : 'var(--muted)', color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AddHabitSheet ─────────────────────────────────────────────────────────────

interface AddHabitSheetProps { open: boolean; onOpenChange: (v: boolean) => void; editHabit?: Habit | null; }

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
      try { setTargetDays(JSON.parse(editHabit.target_days)); } catch { setTargetDays([0,1,2,3,4,5,6]); }
      setReminderTime(editHabit.reminder_time ?? '');
    } else {
      setName(''); setSelectedIcon('check-circle'); setSelectedColor(PRESET_COLORS[0]);
      setFrequency('daily'); setTargetDays([0,1,2,3,4,5,6]); setReminderTime('');
    }
  }, [editHabit, open]);

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
    } finally { setSubmitting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div
        className="absolute right-0 top-0 h-full w-[420px] flex flex-col shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {editHabit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Name</label>
            <input
              className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder="e.g. Morning workout"
              value={name} onChange={(e) => setName(e.target.value)} required
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Icon</label>
            <div className="grid grid-cols-7 gap-1.5 p-3 rounded-xl" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
              {ICON_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => setSelectedIcon(key)} title={key}
                  className="h-9 w-9 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: selectedIcon === key ? hexToRgba(selectedColor, 0.15) : 'transparent',
                    border: selectedIcon === key ? `1.5px solid ${selectedColor}` : '1.5px solid transparent',
                    color: selectedIcon === key ? selectedColor : 'var(--muted-foreground)',
                  }}
                >
                  <HabitIcon name={key} size={17} color={selectedIcon === key ? selectedColor : undefined} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setSelectedColor(color)}
                  className="h-8 w-8 rounded-full transition-all"
                  style={{ background: color, outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Frequency</label>
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
              {(['daily', 'weekly'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFrequency(f)}
                  className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: frequency === f ? 'var(--card)' : 'transparent',
                    color: frequency === f ? 'var(--foreground)' : 'var(--muted-foreground)',
                    boxShadow: frequency === f ? 'var(--card-shadow)' : 'none',
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
                <button key={idx} type="button" onClick={() => setTargetDays((p) => p.includes(idx) ? p.filter((d) => d !== idx) : [...p, idx])}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: targetDays.includes(idx) ? selectedColor : 'var(--background)',
                    color: targetDays.includes(idx) ? '#fff' : 'var(--muted-foreground)',
                    border: `1px solid ${targetDays.includes(idx) ? selectedColor : 'var(--border)'}`,
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
              Reminder <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span>
            </label>
            <input type="time"
              className="rounded-lg border px-3 py-2.5 text-sm w-36 outline-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <div className="mt-auto flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'transparent' }}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
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

// ── Context menu ──────────────────────────────────────────────────────────────

function HabitContextMenu({ x, y, onSkip, onEdit, onDelete, onClose }: {
  x: number; y: number; onSkip: () => void; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  React.useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded-xl shadow-2xl border py-1.5 min-w-[168px]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => { onSkip(); onClose(); }}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 rounded-lg mx-1 transition-colors"
        style={{ color: 'var(--muted-foreground)', width: 'calc(100% - 8px)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <SkipForward size={14} /> Skip Today
      </button>
      <button onClick={() => { onEdit(); onClose(); }}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 rounded-lg mx-1 transition-colors"
        style={{ color: 'var(--foreground)', width: 'calc(100% - 8px)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <PencilSimple size={14} /> Edit
      </button>
      <div className="my-1 mx-2 border-t" style={{ borderColor: 'var(--border)' }} />
      <button onClick={() => { onDelete(); onClose(); }}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 rounded-lg mx-1 transition-colors"
        style={{ color: 'var(--destructive)', width: 'calc(100% - 8px)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
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
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

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
        className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={15} weight="bold" /> New Habit
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
  const allDoneToday = habits.length > 0 && doneToday === habits.length;

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {habits.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} weight="thin" />}
          title="No habits yet"
          description="Start small. One habit at a time builds momentum."
          action={
            <button
              onClick={() => { setEditHabit(null); setSheetOpen(true); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Add your first habit
            </button>
          }
        />
      ) : (
        <>
          {/* ── Hero: Today's progress ────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 flex items-center gap-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
          >
            {/* Progress ring */}
            <div className="relative flex-shrink-0">
              <ProgressRing done={doneToday} total={habits.length} size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{doneToday}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>/{habits.length}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CalendarBlank size={14} style={{ color: 'var(--muted-foreground)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                {allDoneToday ? 'Perfect day! 🎉' : doneToday === 0 ? "Let's get started" : `${habits.length - doneToday} habit${habits.length - doneToday > 1 ? 's' : ''} to go`}
              </h2>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${habits.length > 0 ? (doneToday / habits.length) * 100 : 0}%`,
                    background: allDoneToday ? '#10b981' : 'var(--primary)',
                  }}
                />
              </div>
            </div>

            {/* Streak badge */}
            {longestStreak >= 2 && (
              <div
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <Fire size={20} color="#f59e0b" weight="fill" />
                <span className="text-base font-bold" style={{ color: '#f59e0b' }}>{longestStreak}</span>
                <span className="text-[10px] font-medium" style={{ color: '#f59e0b' }}>streak</span>
              </div>
            )}
          </div>

          {/* ── Habit cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {habits.map((habit) => {
              const todayCheckin = todayCheckins.find((c) => c.habit_id === habit.id && c.checkin_date === today);
              const isDone = todayCheckin?.status === 'done';
              const isSkipped = todayCheckin?.status === 'skip';
              const isPending = pendingCheckins.has(habit.id);
              const streak = computeStreak(allCheckins, habit.id);

              return (
                <div
                  key={habit.id}
                  className="rounded-xl p-4 flex items-center gap-3 transition-all group"
                  style={{
                    background: isDone ? hexToRgba(habit.color, 0.07) : 'var(--card)',
                    border: `1.5px solid ${isDone ? hexToRgba(habit.color, 0.35) : 'var(--border)'}`,
                    boxShadow: isDone ? `0 2px 12px ${hexToRgba(habit.color, 0.12)}` : 'var(--card-shadow)',
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, habit }); }}
                >
                  {/* Icon */}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: hexToRgba(habit.color, isDone ? 0.2 : 0.12),
                      boxShadow: isDone ? `0 0 0 3px ${hexToRgba(habit.color, 0.15)}` : 'none',
                    }}
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
                      {streak >= 3 ? <Fire size={11} color="#f59e0b" weight="fill" /> : null}
                      {streak > 0 ? `${streak}d streak` : isSkipped ? 'Skipped' : 'No streak'}
                    </p>
                  </div>

                  {/* Mark done */}
                  <button
                    onClick={() => !isPending && handleCheckin(habit, todayCheckin?.status)}
                    disabled={isPending}
                    className="flex-shrink-0 transition-all disabled:opacity-50"
                    title={isDone ? 'Mark undone' : 'Mark as done'}
                    style={{ transform: isPending ? 'scale(0.85)' : 'scale(1)' }}
                  >
                    {isDone
                      ? <CheckCircle size={30} color={habit.color} weight="fill" />
                      : <Circle size={30} color="var(--border)" weight="regular" />
                    }
                  </button>

                  {/* More */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, habit }); }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <DotsThreeVertical size={15} weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Monthly Overview ──────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Monthly Overview</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Click any day to see habit breakdown
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear((y) => y - 1); } else setHeatmapMonth((m) => m - 1); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-muted"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <CaretLeft size={14} weight="bold" />
                </button>
                <span className="text-sm font-semibold w-24 text-center" style={{ color: 'var(--foreground)' }}>
                  {MONTH_NAMES[heatmapMonth]} {heatmapYear}
                </span>
                <button
                  onClick={() => { if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear((y) => y + 1); } else setHeatmapMonth((m) => m + 1); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-muted"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </div>

            <MonthlyHeatmap
              year={heatmapYear} month={heatmapMonth}
              checkins={monthCheckins} habits={habits}
              selectedDay={selectedDay} onSelectDay={setSelectedDay}
            />

            {/* Day detail */}
            {selectedDay && (
              <DayDetail ds={selectedDay} habits={habits} checkins={monthCheckins} />
            )}
          </div>

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Completion', value: `${completionPct}%`, sub: 'this month', icon: <TrendUp size={16} color="var(--primary)" weight="bold" /> },
              { label: 'Best Streak', value: `${longestStreak}d`, sub: 'consecutive days', icon: <Fire size={16} color="#f59e0b" weight="fill" /> },
              { label: 'Done Today', value: `${doneToday}/${habits.length}`, sub: 'habits', icon: <CheckCircle size={16} color="#10b981" weight="fill" /> },
              { label: 'Check-ins', value: String(thisMonthDone), sub: 'this month', icon: <CalendarBlank size={16} color="var(--info)" weight="bold" /> },
            ].map((s) => (
              <div key={s.label}
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {contextMenu && (
        <HabitContextMenu
          x={contextMenu.x} y={contextMenu.y}
          onSkip={() => handleSkip(contextMenu.habit)}
          onEdit={() => { setEditHabit(contextMenu.habit); setSheetOpen(true); }}
          onDelete={() => setDeleteTarget(contextMenu.habit)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Habit"
        description={`Delete "${deleteTarget?.name}"? All check-in history will be removed.`}
        confirmLabel="Delete" destructive
        onConfirm={() => { if (deleteTarget) softDelete.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />

      <AddHabitSheet open={sheetOpen} onOpenChange={setSheetOpen} editHabit={editHabit} />
    </div>
  );
}
