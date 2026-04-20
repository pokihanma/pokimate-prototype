'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtext?: string;
  trend?: number; // percentage, positive = up, negative = down
  trendDirection?: 'up-good' | 'up-bad' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtext,
  trend,
  trendDirection = 'up-good',
  icon,
  color,
  onClick,
  loading = false,
}: KPICardProps) {
  const trendColor =
    trend === undefined || trend === 0
      ? 'var(--muted-foreground)'
      : trendDirection === 'neutral'
      ? 'var(--muted-foreground)'
      : (trendDirection === 'up-good' && trend > 0) || (trendDirection === 'up-bad' && trend < 0)
      ? 'var(--success)'
      : 'var(--destructive)';

  const TrendIcon = trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <div
        className="rounded-xl p-4 border"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="shimmer h-3 w-20 rounded mb-3" />
        <div className="shimmer h-7 w-32 rounded mb-2" />
        <div className="shimmer h-3 w-16 rounded" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 border group animate-fade-in"
      onClick={onClick}
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
          (e.currentTarget as HTMLElement).style.borderColor = color || 'var(--primary)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          {title}
        </span>
        {icon && (
          <div
            className="rounded-lg p-1.5"
            style={{
              background: color ? `${color}18` : 'var(--accent)',
              color: color || 'var(--primary)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div
        className="text-2xl font-bold tabular-nums mb-1"
        style={{ color: color || 'var(--foreground)', fontFamily: 'DM Mono, monospace' }}
      >
        {value}
      </div>

      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span className="text-xs font-medium tabular-nums" style={{ color: trendColor }}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
        {subtext && (
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
