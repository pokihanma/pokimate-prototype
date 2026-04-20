'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  TrendUp, TrendDown,
  CurrencyDollar, CreditCard, Target, Pulse, ChartBar, ArrowCircleDown,
  PlusCircle, CheckCircle, Timer, UploadSimple, ArrowsClockwise,
  Warning, Circle, CheckSquare,
  Clock,
} from '@phosphor-icons/react';
import { KPICard, StatRing, LoadingShimmer, EmptyState, DataTable } from '@pokimate/ui';
import { formatINR } from '@pokimate/shared';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { HealthScoreSheet } from '@/components/dashboard/HealthScoreSheet';
import { useDashboard } from '@/hooks/useDashboard';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import type { DashboardTransaction } from '@pokimate/shared';

// ── CSS-variable chart colors (no hardcoded hex in Recharts props) ────────────
const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function healthRingColor(score: number): string {
  if (score >= 96) return 'var(--primary)';
  if (score >= 81) return 'var(--chart-5)';
  if (score >= 61) return 'var(--chart-2)';
  if (score >= 41) return 'var(--chart-3)';
  return 'var(--chart-4)';
}

// ── Animated health score number ─────────────────────────────────────────────
function AnimatedScore({ target }: { target: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(target);
  }, [target, spring]);

  return <motion.span>{display}</motion.span>;
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, children, className = '' }: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {title && (
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ── Money formatter (paise → ₹) ───────────────────────────────────────────────
function rupees(paise: number): string {
  return formatINR(BigInt(Math.round(paise)));
}

function bpToPercent(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

// ── Recent transactions columns ───────────────────────────────────────────────
const txnColumns: ColumnDef<DashboardTransaction, unknown>[] = [
  {
    accessorKey: 'txn_date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.original.txn_date}</span>
    ),
  },
  {
    accessorKey: 'merchant',
    header: 'Merchant / Note',
    cell: ({ row }) => (
      <span>{row.original.merchant ?? row.original.note ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'category_name',
    header: 'Category',
    cell: ({ row }) => (
      <span className="text-xs px-2 py-0.5 rounded-full"
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
        }}
      >
        {row.original.category_name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span
        className="text-xs font-medium capitalize"
        style={{ color: row.original.type === 'income' ? 'var(--chart-2)' : row.original.type === 'expense' ? 'var(--chart-4)' : 'var(--muted-foreground)' }}
      >
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: 'amount_minor',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.type === 'expense' ? '−' : '+'}{rupees(row.original.amount_minor)}
      </span>
    ),
  },
];

// ── Main dashboard page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading } = useDashboard(month);
  const { setActions } = useTopbarActions();
  const router = useRouter();

  // Inject month picker into topbar
  useEffect(() => {
    setActions(<MonthPicker value={month} onChange={setMonth} />);
    return () => setActions(null);
  }, [month, setActions]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {/* Row 0 */}
        <div className="flex gap-4">
          <LoadingShimmer variant="card" className="w-1/4 h-40" />
          <LoadingShimmer variant="card" className="flex-1 h-40" />
        </div>
        {/* Row 1 */}
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingShimmer key={i} variant="card" className="h-24" />
          ))}
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-3 gap-4">
          <LoadingShimmer variant="card" className="col-span-2 h-56" />
          <LoadingShimmer variant="card" className="h-56" />
        </div>
        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-4">
          <LoadingShimmer variant="card" className="h-56" />
          <LoadingShimmer variant="card" className="h-56" />
        </div>
        {/* Row 4 */}
        <div className="grid grid-cols-3 gap-4">
          <LoadingShimmer variant="card" className="h-56" />
          <LoadingShimmer variant="card" className="h-56" />
          <LoadingShimmer variant="card" className="h-56" />
        </div>
        {/* Row 5 */}
        <LoadingShimmer variant="card" className="h-64" />
      </div>
    );
  }

  const { health_score, kpis, net_worth_trend, cashflow_trend, expense_by_category,
    budget_status, habits_today, goals_progress, upcoming_bills,
    recent_transactions, conflicts_count } = data;

  // Compute income vs expense trend for chart
  const savingsRate = kpis.savings_rate_bp / 100; // %
  const savingsTrend = savingsRate >= 0 ? 'up' : 'down';

  return (
    <div className="space-y-4 pb-6">
      {/* ── Conflict banner ────────────────────────────────────────────────── */}
      {conflicts_count > 0 && (
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: 'var(--chart-3)', color: '#fff' }}
        >
          <Warning size={16} />
          <span>
            {conflicts_count} sync conflict{conflicts_count > 1 ? 's' : ''} need your attention.
          </span>
          <button
            type="button"
            className="ml-auto underline text-xs"
            onClick={() => router.push('/settings')}
          >
            Resolve
          </button>
        </div>
      )}

      {/* ── Row 0: Health score ring (1/4) + Quick actions (3/4) ───────────── */}
      <div className="flex gap-4">
        {/* Health ring */}
        <SectionCard className="w-64 flex flex-col items-center justify-center gap-3 cursor-pointer select-none shrink-0"
          title="Health Score"
        >
          <div
            className="relative flex items-center justify-center"
            onClick={() => setSheetOpen(true)}
          >
            <svg
              width={120}
              height={120}
              className="transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={60} cy={60} r={50}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={10}
              />
              {/* Foreground ring */}
              <circle
                cx={60} cy={60} r={50}
                fill="none"
                stroke={healthRingColor(health_score.total)}
                strokeWidth={10}
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={(1 - health_score.total / 100) * 2 * Math.PI * 50}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-bold"
                style={{ color: healthRingColor(health_score.total) }}
              >
                <AnimatedScore target={health_score.total} />
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Tap ring for breakdown
          </p>
        </SectionCard>

        {/* Quick actions */}
        <SectionCard className="flex-1" title="Quick Actions">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/finance/transactions')}
              className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium hover:bg-muted transition-colors w-28"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <PlusCircle size={22} style={{ color: 'var(--chart-1)' }} />
              Add Transaction
            </button>
            <button
              type="button"
              onClick={() => router.push('/habits')}
              className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium hover:bg-muted transition-colors w-28"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <CheckCircle size={22} style={{ color: 'var(--chart-2)' }} />
              Check Habit
            </button>
            <button
              type="button"
              onClick={() => router.push('/time')}
              className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium hover:bg-muted transition-colors w-28"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <Timer size={22} style={{ color: 'var(--chart-3)' }} />
              Start Timer
            </button>
            <button
              type="button"
              disabled
              className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium opacity-50 cursor-not-allowed w-28"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              title="Bank Import coming in Phase 4"
            >
              <UploadSimple size={22} style={{ color: 'var(--chart-4)' }} />
              Import Bank
            </button>
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium hover:bg-muted transition-colors w-28"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <ArrowsClockwise size={22} style={{ color: 'var(--chart-5)' }} />
              Sync
            </button>
          </div>
        </SectionCard>
      </div>

      {/* ── Row 1: 6 KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard
          title="Net Worth"
          value={rupees(kpis.net_worth_minor)}
          icon={<CurrencyDollar size={18} />}
          color="var(--chart-1)"
        />
        <KPICard
          title="Monthly Income"
          value={rupees(kpis.income_minor)}
          icon={<TrendUp size={18} />}
          color="var(--chart-2)"
        />
        <KPICard
          title="Monthly Expense"
          value={rupees(kpis.expense_minor)}
          icon={<TrendDown size={18} />}
          color="var(--chart-4)"
        />
        <KPICard
          title="Savings Rate"
          value={bpToPercent(kpis.savings_rate_bp)}
          icon={<Pulse size={18} />}
          trend={bpToPercent(kpis.savings_rate_bp)}
          trendDirection={savingsTrend}
          color={kpis.savings_rate_bp >= 0 ? 'var(--chart-2)' : 'var(--chart-4)'}
        />
        <KPICard
          title="Investments"
          value={rupees(kpis.total_investments_minor)}
          icon={<ChartBar size={18} />}
          color="var(--chart-5)"
        />
        <KPICard
          title="Total Debt"
          value={rupees(kpis.total_debt_minor)}
          icon={<CreditCard size={18} />}
          color={kpis.total_debt_minor > 0 ? 'var(--chart-4)' : 'var(--chart-2)'}
        />
      </div>

      {/* ── Row 2: Net worth trend (2/3) + Expense donut (1/3) ──────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <SectionCard title="Net Worth (12 months)" className="col-span-2">
          {net_worth_trend.length === 0 ? (
            <EmptyState icon={<ChartBar size={32} />} title="No data" description="Add transactions to see your net worth trend." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={net_worth_trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tickFormatter={(v: number) => `₹${Math.round(v / 100)}` }
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [rupees(v), 'Net Worth']}
                  labelFormatter={(v: string) => `Month: ${v}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount_minor"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#nwGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Expenses by Category">
          {expense_by_category.length === 0 ? (
            <EmptyState icon={<Circle size={32} />} title="No expenses" description="No expense data for this month." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expense_by_category}
                  dataKey="amount_minor"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  strokeWidth={1}
                  stroke="var(--card)"
                >
                  {expense_by_category.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _name: string, props: { payload?: { category_name: string; percentage_bp: number } }) => [
                    `${rupees(v)} (${bpToPercent(props.payload?.percentage_bp ?? 0)})`,
                    props.payload?.category_name,
                  ]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: 'var(--foreground)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Cashflow bar chart (1/2) + Budget status bars (1/2) ─────── */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Income vs Expense (6 months)">
          {cashflow_trend.every((m) => m.income_minor === 0 && m.expense_minor === 0) ? (
            <EmptyState icon={<ChartBar size={32} />} title="No data" description="No transactions in the past 6 months." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashflow_trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tickFormatter={(v: number) => `₹${Math.round(v / 100)}`}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [rupees(v), name === 'income_minor' ? 'Income' : 'Expense']}
                  labelFormatter={(v: string) => `Month: ${v}`}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: 'var(--foreground)' }}>
                      {value === 'income_minor' ? 'Income' : 'Expense'}
                    </span>
                  )}
                />
                <Bar dataKey="income_minor" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense_minor" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Budget Status">
          {budget_status.length === 0 ? (
            <EmptyState icon={<Target size={32} />} title="No budgets" description="Set up budgets in Finance → Budgets." />
          ) : (
            <div className="space-y-3">
              {budget_status.slice(0, 6).map((b) => {
                const pct = Math.min(b.percentage_bp / 100, 100);
                const barColor = pct >= 100 ? 'var(--chart-4)' : pct >= 80 ? 'var(--chart-3)' : 'var(--chart-2)';
                return (
                  <div key={b.category_name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{b.category_name}</span>
                      <span className="text-muted-foreground">
                        {rupees(b.spent_minor)} / {rupees(b.limit_minor)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 4: Goals (1/3) + Habits today (1/3) + Upcoming bills (1/3) ─── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Goals */}
        <SectionCard title="Goals Progress">
          {goals_progress.length === 0 ? (
            <EmptyState icon={<Target size={32} />} title="No goals" description="Create goals to track your progress." />
          ) : (
            <div className="space-y-3">
              {goals_progress.slice(0, 4).map((g) => {
                const pct = Math.min(g.percentage_bp / 100, 100);
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium flex items-center gap-1">
                        {g.on_track ? (
                          <span style={{ color: 'var(--chart-2)' }}>●</span>
                        ) : (
                          <span style={{ color: 'var(--chart-3)' }}>●</span>
                        )}
                        {g.title}
                      </span>
                      <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: g.on_track ? 'var(--chart-2)' : 'var(--chart-3)' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{rupees(g.current_minor)}</span>
                      <span>{rupees(g.target_minor)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Habits today */}
        <SectionCard title="Today's Habits">
          {habits_today.length === 0 ? (
            <EmptyState icon={<CheckSquare size={32} />} title="No habits" description="Create habits in the Habits section." />
          ) : (
            <div className="space-y-2">
              {habits_today.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: h.checked_in ? 'var(--chart-2)' : 'var(--muted)',
                      color: h.checked_in ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    {h.checked_in ? '✓' : ''}
                  </div>
                  <span className={h.checked_in ? 'line-through text-muted-foreground' : ''}>
                    {h.name}
                  </span>
                  {h.streak > 0 && (
                    <span className="ml-auto text-xs font-medium" style={{ color: 'var(--chart-3)' }}>
                      🔥{h.streak}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Upcoming bills */}
        <SectionCard title="Upcoming Bills (30 days)">
          {upcoming_bills.length === 0 ? (
            <EmptyState icon={<Clock size={32} />} title="No upcoming bills" description="No subscriptions due in the next 30 days." />
          ) : (
            <div className="space-y-2">
              {upcoming_bills.slice(0, 6).map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.due_date} · {b.days_until === 0 ? 'Today' : `in ${b.days_until}d`}
                    </p>
                  </div>
                  <span
                    className="font-medium tabular-nums"
                    style={{ color: b.days_until <= 3 ? 'var(--chart-4)' : 'var(--foreground)' }}
                  >
                    {rupees(b.amount_minor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 5: Recent transactions (full width) ─────────────────────────── */}
      <SectionCard title="Recent Transactions">
        {recent_transactions.length === 0 ? (
          <EmptyState icon={<ArrowCircleDown size={32} />} title="No transactions" description="Add your first transaction to get started." />
        ) : (
          <DataTable<DashboardTransaction>
            columns={txnColumns}
            data={recent_transactions}
          />
        )}
      </SectionCard>

      {/* ── Health score detail sheet ───────────────────────────────────────── */}
      <HealthScoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        healthScore={health_score}
        scoreHistory={[]}
      />
    </div>
  );
}
