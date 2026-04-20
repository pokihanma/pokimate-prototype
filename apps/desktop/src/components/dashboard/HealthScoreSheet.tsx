'use client';

import { X } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { HealthScore } from '@pokimate/shared';

interface HealthScoreSheetProps {
  open: boolean;
  onClose: () => void;
  healthScore: HealthScore;
  scoreHistory: { month: string; score: number }[];
}

export function HealthScoreSheet({
  open,
  onClose,
  healthScore,
  scoreHistory,
}: HealthScoreSheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl border-t border-border flex flex-col max-h-[80vh]"
        style={{ background: 'var(--card)' }}
        role="dialog"
        aria-label="Health Score Detail"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="flex items-center justify-between px-6 pb-3">
          <h2 className="font-semibold text-lg">Health Score Breakdown</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex-1 space-y-6">
          {/* Score summary */}
          <div className="flex items-center gap-4">
            <span
              className="text-5xl font-bold"
              style={{ color: getHealthColor(healthScore.total) }}
            >
              {healthScore.total}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">out of 100</p>
              <p className="text-sm font-medium">{getHealthLabel(healthScore.total)}</p>
            </div>
          </div>

          {/* Component rows */}
          <div className="space-y-3">
            {healthScore.components.map((c) => {
              const pct = (c.score / c.max) * 100;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? 'var(--chart-2)' : pct >= 50 ? 'var(--chart-3)' : 'var(--chart-4)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.tip}</p>
                </div>
              );
            })}
          </div>

          {/* Score history chart */}
          {scoreHistory.length > 1 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Score History (12 months)</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={scoreHistory} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelFormatter={(v: string) => `Month: ${v}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getHealthColor(score: number): string {
  if (score >= 96) return 'var(--primary)';
  if (score >= 81) return 'var(--chart-5)';
  if (score >= 61) return 'var(--chart-2)';
  if (score >= 41) return 'var(--chart-3)';
  return 'var(--chart-4)';
}

function getHealthLabel(score: number): string {
  if (score >= 96) return 'Excellent';
  if (score >= 81) return 'Very Good';
  if (score >= 61) return 'Good';
  if (score >= 41) return 'Fair';
  return 'Needs Attention';
}
