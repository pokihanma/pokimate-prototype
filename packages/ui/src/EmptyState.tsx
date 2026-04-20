'use client';
import * as React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      {icon && (
        <div
          className="mb-4 rounded-2xl p-5"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
