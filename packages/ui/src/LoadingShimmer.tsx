import * as React from 'react';

export interface LoadingShimmerProps {
  variant?: 'card' | 'row' | 'text';
  className?: string;
}

export function LoadingShimmer({
  variant = 'card',
  className = '',
}: LoadingShimmerProps) {
  const baseClass = 'animate-pulse rounded';
  const style = {
    background: 'var(--muted)',
  };

  if (variant === 'card') {
    return (
      <div
        className={`h-24 ${baseClass} ${className}`}
        style={style}
      />
    );
  }

  if (variant === 'row') {
    return (
      <div className={`flex gap-4 py-3 ${className}`}>
        <div className={`h-4 flex-1 ${baseClass}`} style={style} />
        <div className={`h-4 w-24 ${baseClass}`} style={style} />
        <div className={`h-4 w-20 ${baseClass}`} style={style} />
      </div>
    );
  }

  return (
    <div className={`h-4 w-3/4 ${baseClass} ${className}`} style={style} />
  );
}
