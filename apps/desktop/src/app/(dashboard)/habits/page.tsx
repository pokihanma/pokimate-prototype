'use client';

import * as React from 'react';
import { CheckCircle2, Circle, Flame, Plus, Trash2, Calendar } from 'lucide-react';
import { EmptyState } from '@pokimate/ui';
import { useHabits, useUpsertCheckin, useCreateHabit, useSoftDeleteHabit, useHabitCheckins } from '@/hooks/useHabits';
import { useAuthStore } from '@/store/auth';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { ConfirmDialog } from '@pokimate/ui';

function today() {
  return new Date().toISOString().split('T')[0];
}

function getLast60Days() {
  const days: string[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getWeekDates() {
  const days = [];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Heatmap ──────────────────────────────────────────────────────────────────
function HabitHeatmap({ habitId }: { habitId: string }) {
  const days = getLast60Days();
  const fromDate = days[0];
  const toDate = days[days.length - 1];
  const { data: checkins = [] } = useHabitCheckins(habitId, fromDate, toDate);
  const checkinSet = new Set(checkins.filter(c => c.status === 'done').map(c => c.checkin_date));

  // Group into weeks
  const weeks: string[][] = [];
  let week: string[] = [];
  days.forEach((d, i) => {
    week.push(d);
    if (week.length === 7 || i === days.length - 1) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wk.map((d) => (
              <div
                key={d}
                title={d}
                className="rounded-sm"
                style={{
                  width: 10,
                  height: 10,
                  background: checkinSet.has(d)
                    ? 'var(--success)'
                    : 'var(--muted)',
                  opacity: checkinSet.has(d) ? 0.9 : 0.4,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>60 days ago</span>
        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Today</span>
      </div>
    </div>
  );
}

// ── Weekly summary ────────────────────────────────────────────────────────────
function WeeklySummary() {
  const { data: habits = [] } = useHabits();
  const weekDates = getWeekDates();
  const fromDate = weekDates[0];
  const toDate = weekDates[6];
  const user = useAuthStore((s) => s.user);

  // We compute total possible checkins this week vs done
  const totalPossible = habits.length * 7;

  return (
    <div
      className="rounded-xl p-4 border mb-6"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
        This Week
      </h3>
      <div className="flex gap-2">
        {weekDates.map((d, i) => {
          const isToday = d === today();
          const isPast = d < today();
          return (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                {DAY_LABELS[i]}
              </span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: isToday ? 'var(--primary)' : isPast ? 'var(--muted)' : 'transparent',
                  color: isToday ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: isToday ? 'none' : '1px solid var(--border)',
                }}
              >
                {new Date(d).getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add Habit Sheet ───────────────────────────────────────────────────────────
function AddHabitSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createHabit = useCreateHabit();
  const [name, setName] = React.useState('');
  const [icon, setIcon] = React.useState('✅');
  const [color, setColor] = React.useState('#6366f1');
  const [frequency, setFrequency] = React.useState('daily');
  const [submitting, setSubmitting] = React.useState(false);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
  const EMOJIS = ['✅', '🏃', '📖', '💧', '🧘', '💪', '🎯', '⭐', '🔥', '🌟', '💡', '🎨'];

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createHabit.mutateAsync({ name: name.trim(), icon, color, frequency });
      setName(''); setIcon('✅'); setColor('#6366f1'); setFrequency('daily');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputStyle = {
    background: 'var(--input)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: 8,
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>Add Habit</h2>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Habit Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Walk"
              className="w-full px-3 py-2 text-sm"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className="text-xl rounded-lg w-10 h-10 flex items-center justify-center"
                  style={{
                    background: icon === e ? 'var(--accent)' : 'var(--muted)',
                    border: icon === e ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: c,
                    border: color === c ? '3px solid var(--foreground)' : '3px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Frequency</label>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {['daily', 'weekly'].map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className="flex-1 py-2 text-sm capitalize"
                  style={{
                    background: frequency === f ? 'var(--primary)' : 'var(--input)',
                    color: frequency === f ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {submitting ? 'Adding…' : 'Add Habit'}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Habit Card ────────────────────────────────────────────────────────────────
function HabitCard({ habit }: { habit: any }) {
  const checkin = useUpsertCheckin();
  const deleteHabit = useSoftDeleteHabit();
  const [checking, setChecking] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const todayStr = today();
  // Fetch today's checkins to show status
  const { data: todayCheckins = [] } = useHabitCheckins(habit.id, todayStr, todayStr);
  const isCheckedToday = todayCheckins.some(c => c.checkin_date === todayStr && c.status === 'done');

  const handleCheckin = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkin.mutateAsync({
        habit_id: habit.id,
        checkin_date: todayStr,
        status: isCheckedToday ? 'skip' : 'done',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: 'var(--card)',
        borderColor: isCheckedToday ? 'var(--success)' : 'var(--border)',
        boxShadow: isCheckedToday ? '0 0 0 1px var(--success)' : 'var(--card-shadow)',
      }}
    >
      <div className="p-4 flex items-center gap-3">
        {/* Emoji icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${habit.color}20` }}
        >
          {habit.icon || '✅'}
        </div>

        {/* Name + streak */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
            {habit.name}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {habit.frequency}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
            title="Show heatmap"
          >
            <Calendar size={14} />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
          >
            <Trash2 size={14} />
          </button>
          {/* Big check button */}
          <button
            onClick={handleCheckin}
            disabled={checking}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: isCheckedToday ? 'var(--success)' : 'var(--muted)',
              color: isCheckedToday ? '#fff' : 'var(--muted-foreground)',
              transform: checking ? 'scale(0.95)' : 'scale(1)',
            }}
            title={isCheckedToday ? 'Mark as incomplete' : 'Mark as done'}
          >
            {isCheckedToday ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>
        </div>
      </div>

      {/* Heatmap (expandable) */}
      {expanded && (
        <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <HabitHeatmap habitId={habit.id} />
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Habit"
        description="This habit and all its checkin history will be hidden. You can recover it from Settings."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteHabit.mutate(habit.id)}
      />
    </div>
  );
}

// ── Weekly stats ──────────────────────────────────────────────────────────────
function WeeklyStats() {
  const { data: habits = [] } = useHabits();
  const weekDates = getWeekDates();

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: 'Active Habits', value: habits.length, color: 'var(--primary)' },
        { label: 'Done Today', value: '—', color: 'var(--success)' },
        { label: 'This Week', value: '—', color: 'var(--warning)' },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-xl p-3 border text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="text-xl font-bold tabular-nums" style={{ color }}>
            {value}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits();
  const { setActions } = useTopbarActions();
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => setAddOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={16} />
        Add Habit
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Habits</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <WeeklySummary />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border p-4 shimmer h-20" style={{ borderColor: 'var(--border)' }} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={40} />}
          title="No habits yet"
          description="Build positive habits by tracking them daily. Start with something small!"
          action={
            <button
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              + Add Your First Habit
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Today — {habits.length} habits
          </p>
          {habits.map(habit => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}

      <AddHabitSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
