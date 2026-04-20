'use client';

import * as React from 'react';
import {
  Clock,
  Plus,
  Square,
  PencilSimple,
  Trash,
  Check,
  X,
} from '@phosphor-icons/react';
import { LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import type { TimeEntry } from '@pokimate/shared';
import {
  useTimeEntries,
  useCreateEntry,
  useStopEntry,
  useSoftDeleteEntry,
} from '@/hooks/useTime';
import { invokeWithToast } from '@/lib/tauri';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Work', 'Study', 'Exercise', 'Personal', 'Family',
  'Health', 'Creative', 'Finance', 'Reading', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  Work: '#5b6cf9',
  Study: '#10b981',
  Exercise: '#f59e0b',
  Personal: '#8b5cf6',
  Family: '#ec4899',
  Health: '#ef4444',
  Creative: '#06b6d4',
  Finance: '#84cc16',
  Reading: '#f97316',
  Other: '#737373',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
    monday,
  };
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function groupByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  const groups: Record<string, TimeEntry[]> = {};
  for (const entry of entries) {
    const day = entry.start_time.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(entry);
  }
  return groups;
}

function categoryColor(cat: string | null): string {
  if (!cat) return CATEGORY_COLORS['Other'];
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Other'];
}

// ── Active timer banner ───────────────────────────────────────────────────────

interface ActiveTimerBannerProps {
  entry: TimeEntry;
  onStop: () => void;
}

function ActiveTimerBanner({ entry, onStop }: ActiveTimerBannerProps) {
  const [elapsed, setElapsed] = React.useState(() => formatElapsed(entry.start_time));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(entry.start_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [entry.start_time]);

  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 80%, var(--chart-5)) 100%)',
        color: 'white',
      }}
    >
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        <Clock size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium opacity-80">Timer running</p>
        <p className="font-semibold text-lg truncate">{entry.title}</p>
        {entry.category && (
          <p className="text-sm opacity-70">{entry.category}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-3xl font-mono font-bold tracking-wider">{elapsed}</p>
      </div>
      <button
        onClick={onStop}
        className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
        style={{ background: 'var(--destructive)' }}
        title="Stop timer"
      >
        <Square size={20} fill="white" color="white" />
      </button>
    </div>
  );
}

// ── Start timer section ───────────────────────────────────────────────────────

interface StartTimerSectionProps {
  onStart: (title: string, category: string) => void;
  loading: boolean;
}

function StartTimerSection({ onStart, loading }: StartTimerSectionProps) {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('Work');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onStart(title.trim(), category);
    setTitle('');
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-sm font-semibold mb-3">Start New Timer</p>
      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
        <input
          className="flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="What are you working on?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: 'var(--primary)' }}
        >
          <Clock size={14} /> Start Timer
        </button>
      </form>
    </div>
  );
}

// ── Add Past Entry Sheet ──────────────────────────────────────────────────────

interface AddPastEntrySheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AddPastEntrySheet({ open, onOpenChange }: AddPastEntrySheetProps) {
  const createEntry = useCreateEntry();
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('Work');
  const [date, setDate] = React.useState(todayStr());
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [duration, setDuration] = React.useState<number | null>(60);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      setDuration(mins > 0 ? mins : null);
    }
  }, [startTime, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !duration || duration <= 0) return;
    setSubmitting(true);
    try {
      await createEntry.mutateAsync({
        title: title.trim(),
        category,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
      });
      onOpenChange(false);
      setTitle('');
      setCategory('Work');
      setDate(todayStr());
      setStartTime('09:00');
      setEndTime('10:00');
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
          <h2 className="text-lg font-semibold">Add Past Entry</h2>
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="What did you work on?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Category</label>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Start Time</label>
              <input
                type="time"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">End Time</label>
              <input
                type="time"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {duration !== null && duration > 0 && (
            <p className="text-sm text-muted-foreground">
              Duration: <strong>{formatDuration(duration)}</strong>
            </p>
          )}
          <div className="mt-auto flex gap-3">
            <button type="button" onClick={() => onOpenChange(false)} className="flex-1 rounded-md py-2 text-sm font-medium border border-border hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !duration || duration <= 0}
              className="flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {submitting ? 'Adding…' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────

interface EditRowProps {
  entry: TimeEntry;
  onSave: (title: string, category: string) => void;
  onCancel: () => void;
}

function EditRow({ entry, onSave, onCancel }: EditRowProps) {
  const [title, setTitle] = React.useState(entry.title);
  const [category, setCategory] = React.useState(entry.category ?? 'Work');
  return (
    <div className="flex gap-2 flex-1">
      <input
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <select
        className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => onSave(title, category)} className="rounded p-1 hover:bg-muted text-chart-2">
        <Check size={14} style={{ color: 'var(--chart-2)' }} />
      </button>
      <button onClick={onCancel} className="rounded p-1 hover:bg-muted text-muted-foreground">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Weekly summary ────────────────────────────────────────────────────────────

interface WeeklySummaryProps {
  entries: TimeEntry[];
  monday: Date;
}

function WeeklySummary({ entries, monday }: WeeklySummaryProps) {
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Hours per day (Mon-Sun)
  const dayData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);
    const mins = entries
      .filter((e) => e.start_time.slice(0, 10) === dStr)
      .reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
    return { day: DAY_NAMES[i], hours: parseFloat((mins / 60).toFixed(1)) };
  });

  // Category breakdown
  const catTotals: Record<string, number> = {};
  for (const e of entries) {
    const cat = e.category ?? 'Other';
    catTotals[cat] = (catTotals[cat] ?? 0) + (e.duration_minutes ?? 0);
  }
  const pieData = Object.entries(catTotals).map(([name, mins]) => ({
    name,
    value: parseFloat((mins / 60).toFixed(1)),
  }));

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">This Week</h3>
        <span className="text-2xl font-bold text-foreground">{totalHours}h</span>
      </div>

      {/* Bar chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Hours per day</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={dayData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip formatter={(v: number) => `${v}h`} />
            <Bar dataKey="hours" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart */}
      {pieData.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">By category</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={categoryColor(entry.name)} />
                ))}
              </Pie>
              <Legend
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>}
              />
              <Tooltip formatter={(v: number) => `${v}h`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TimePage() {
  const { setActions } = useTopbarActions();

  const [pastSheetOpen, setPastSheetOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TimeEntry | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { from, to, monday } = weekRange();

  // Fetch last 30 days to show today+this week
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const toDate = new Date().toISOString().slice(0, 10);

  const entriesQuery = useTimeEntries(fromDate, toDate);
  const entries = (entriesQuery.data ?? []).filter((e) => !e.deleted_at);

  const runningEntry = entries.find((e) => e.is_running === 1);
  const today = todayStr();
  const todayEntries = entries.filter(
    (e) => e.is_running !== 1 && e.start_time.slice(0, 10) === today
  );
  const weekEntries = entries.filter((e) => {
    const d = e.start_time.slice(0, 10);
    return d >= from && d <= to && e.is_running !== 1;
  });

  const createEntry = useCreateEntry();
  const stopEntry = useStopEntry();
  const softDelete = useSoftDeleteEntry();

  const handleSaveEdit = async (entry: TimeEntry, title: string, category: string) => {
    await invokeWithToast<void>('time_update_entry', {
      id: entry.id,
      title,
      category,
    }).catch(() => {});
    entriesQuery.refetch();
    setEditingId(null);
  };

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => setPastSheetOpen(true)}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}
      >
        <Plus size={16} /> Add Past Entry
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  if (entriesQuery.isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <LoadingShimmer key={i} variant="row" />)}
      </div>
    );
  }

  const groupedToday = groupByDay(todayEntries);
  const groupedWeek = groupByDay(weekEntries.filter((e) => e.start_time.slice(0, 10) !== today));
  const allGroups = { ...groupedToday };
  for (const [k, v] of Object.entries(groupedWeek)) {
    if (!allGroups[k]) allGroups[k] = v;
  }
  const sortedDays = Object.keys(allGroups).sort().reverse();

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Active timer banner */}
      {runningEntry && (
        <ActiveTimerBanner
          entry={runningEntry}
          onStop={() => stopEntry.mutate(runningEntry.id)}
        />
      )}

      {/* Start timer */}
      <StartTimerSection
        loading={createEntry.isPending}
        onStart={(title, category) =>
          createEntry.mutate({
            title,
            category,
            start_time: new Date().toISOString(),
          })
        }
      />

      <div className="flex gap-5 items-start flex-col lg:flex-row">
        {/* Entries list */}
        <div className="flex-1 min-w-0">
          {sortedDays.length === 0 ? (
            <EmptyState
              icon={<Clock size={40} className="text-muted-foreground" />}
              title="No time entries"
              description="Start a timer or add a past entry to begin tracking."
              action={
                <button
                  onClick={() => setPastSheetOpen(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  Add your first entry
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-5">
              {sortedDays.map((day) => (
                <div key={day}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {day === today ? 'Today' : day}
                  </p>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {allGroups[day].map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        style={{
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          background: 'var(--card)',
                        }}
                      >
                        {/* Category color bar */}
                        <div
                          className="w-1 rounded-full self-stretch flex-shrink-0"
                          style={{ background: categoryColor(entry.category) }}
                        />

                        {editingId === entry.id ? (
                          <EditRow
                            entry={entry}
                            onSave={(t, c) => handleSaveEdit(entry, t, c)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                              {entry.category && (
                                <p className="text-xs text-muted-foreground mt-0.5">{entry.category}</p>
                              )}
                            </div>
                            <span className="text-sm font-mono text-muted-foreground flex-shrink-0">
                              {formatDuration(entry.duration_minutes)}
                            </span>
                            <button
                              onClick={() => setEditingId(entry.id)}
                              className="rounded-md p-1.5 hover:bg-muted text-muted-foreground flex-shrink-0"
                            >
                              <PencilSimple size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(entry)}
                              className="rounded-md p-1.5 hover:bg-muted text-destructive flex-shrink-0"
                            >
                              <Trash size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly summary sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <WeeklySummary entries={weekEntries} monday={monday} />
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Entry"
        description={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) softDelete.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* Add past entry sheet */}
      <AddPastEntrySheet open={pastSheetOpen} onOpenChange={setPastSheetOpen} />
    </div>
  );
}
