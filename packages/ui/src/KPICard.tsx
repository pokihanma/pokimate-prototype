import * as React from 'react';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtext,
  trend,
  trendDirection = 'neutral',
  onClick,
  icon,
  color,
  className = '',
}: KPICardProps) {
  const trendColor =
    trendDirection === 'up'
      ? 'var(--chart-2)'
      : trendDirection === 'down'
        ? 'var(--chart-4)'
        : 'var(--muted-foreground)';

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={Comp === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg border p-4 text-left w-full ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
      style={{
        background: 'var(--card)',
        color: 'var(--card-foreground)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-semibold mt-1 truncate" style={color ? { color } : undefined}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs mt-0.5 opacity-70" style={{ color: 'var(--muted-foreground)' }}>
              {subtext}
            </p>
          )}
          {trend !== undefined && trend !== '' && (
            <span className="text-xs font-medium mt-1 inline-block" style={{ color: trendColor }}>
              {trend}
            </span>
          )}
        </div>
        {icon && (
          <div className="shrink-0 opacity-80" style={color ? { color } : undefined}>
            {icon}
          </div>
        )}
      </div>
    </Comp>
  );
}
