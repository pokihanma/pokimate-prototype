import * as React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div
        className="mb-4 opacity-60"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      <p
        className="mt-1 text-sm max-w-sm"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
