'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, LoadingShimmer, EmptyState, KPICard, MoneyDisplay } from '@pokimate/ui';
import { TrendUp } from '@phosphor-icons/react';
import type { HoldingWithPnL } from '@pokimate/shared';
import { formatINR } from '@pokimate/shared';
import { usePortfolio } from '@/hooks/useInvestments';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { ImportGrowwModal } from '@/components/finance/ImportGrowwModal';

const CHART_COLORS = [
  'var(--chart-1, #5B6CF9)',
  'var(--chart-2, #10B981)',
  'var(--chart-3, #F59E0B)',
  'var(--chart-4, #EF4444)',
  'var(--chart-5, #8B5CF6)',
  'var(--chart-6, #06B6D4)',
];

export default function InvestmentsPage() {
  const { data: holdings, isLoading } = usePortfolio();
  const { setActions } = useTopbarActions();
  const [growwOpen, setGrowwOpen] = React.useState(false);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => setGrowwOpen(true)}
        className="px-3 py-1.5 rounded-md border text-sm flex items-center gap-1.5"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}
      >
        📈 Import from Groww
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  const totalInvested = holdings.reduce((s, h) => s + h.holding.total_invested_minor, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.current_value_minor, 0);
  const totalPnl = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100) : 0;

  // Asset allocation for donut chart
  const allocationData = React.useMemo(() => {
    const byType = new Map<string, number>();
    holdings.forEach((h) => {
      const type = h.asset.asset_type;
      byType.set(type, (byType.get(type) ?? 0) + h.current_value_minor);
    });
    return Array.from(byType.entries()).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      display: formatINR(BigInt(value)),
    }));
  }, [holdings]);

  const columns: ColumnDef<HoldingWithPnL>[] = [
    {
      accessorKey: 'asset.name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{row.original.asset.name}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {row.original.asset.asset_type.replace('_', ' ')} · {row.original.asset.symbol}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'holding.quantity_str',
      header: 'Units',
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--foreground)' }}>{row.original.holding.quantity_str}</span>
      ),
    },
    {
      accessorKey: 'holding.avg_cost_minor',
      header: 'Avg Cost',
      cell: ({ row }) => (
        <MoneyDisplay paise={BigInt(row.original.holding.avg_cost_minor)} className="text-sm" />
      ),
    },
    {
      accessorKey: 'current_price_minor',
      header: 'Current Price',
      cell: ({ row }) => (
        <MoneyDisplay paise={BigInt(row.original.current_price_minor)} className="text-sm" />
      ),
    },
    {
      accessorKey: 'holding.total_invested_minor',
      header: 'Invested',
      cell: ({ row }) => (
        <MoneyDisplay paise={BigInt(row.original.holding.total_invested_minor)} className="text-sm font-medium" />
      ),
    },
    {
      accessorKey: 'pnl_minor',
      header: 'P&L',
      cell: ({ row }) => {
        const pnl = row.original.pnl_minor;
        const pct = row.original.pnl_percent_bp / 100;
        const isPos = pnl >= 0;
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: isPos ? 'var(--success, #16a34a)' : 'var(--destructive)' }}>
              {isPos ? '+' : ''}<MoneyDisplay paise={BigInt(Math.abs(pnl))} />
            </p>
            <p className="text-xs" style={{ color: isPos ? 'var(--success, #16a34a)' : 'var(--destructive)' }}>
              {isPos ? '+' : ''}{pct.toFixed(2)}%
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Investments</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Portfolio overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Invested"
          value={formatINR(BigInt(totalInvested))}
          icon="💰"
        />
        <KPICard
          label="Current Value"
          value={formatINR(BigInt(totalCurrent))}
          icon="📊"
        />
        <KPICard
          label="Overall P&L"
          value={`${totalPnl >= 0 ? '+' : ''}${formatINR(BigInt(Math.abs(totalPnl)))}`}
          icon={totalPnl >= 0 ? '📈' : '📉'}
          trend={totalPnl >= 0 ? 'up' : 'down'}
        />
        <KPICard
          label="P&L %"
          value={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
          icon="🎯"
          trend={pnlPct >= 0 ? 'up' : 'down'}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <LoadingShimmer variant="card" className="h-64" />
          {Array.from({ length: 4 }).map((_, i) => <LoadingShimmer key={i} variant="row" />)}
        </div>
      ) : holdings.length === 0 ? (
        <EmptyState
          icon={<TrendUp size={48} />}
          title="No investments yet"
          description="Import your Groww portfolio to see holdings, P&L, and asset allocation."
          action={
            <button
              onClick={() => setGrowwOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              📈 Import from Groww
            </button>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Holdings</h2>
            <DataTable columns={columns} data={holdings} />
          </div>
          <div className="space-y-4">
            <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>Asset Allocation</h2>
            <div
              className="rounded-xl border p-4"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {allocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {allocationData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => formatINR(BigInt(val))}
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--foreground)', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: 'var(--muted-foreground)' }}>No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ImportGrowwModal open={growwOpen} onOpenChange={setGrowwOpen} />
    </div>
  );
}
