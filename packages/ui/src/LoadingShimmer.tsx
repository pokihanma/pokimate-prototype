'use client';
import * as React from 'react';

interface LoadingShimmerProps {
  variant?: 'card' | 'row' | 'text' | 'circle' | 'kpi';
  count?: number;
  className?: string;
}

function ShimmerBox({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`shimmer rounded ${className}`}
      style={{ background: 'var(--muted)', ...style }}
    />
  );
}

function KPIShimmer() {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex justify-between mb-3">
        <ShimmerBox className="h-3 w-20" />
        <ShimmerBox className="h-7 w-7 rounded-lg" />
      </div>
      <ShimmerBox className="h-7 w-28 mb-2" />
      <ShimmerBox className="h-3 w-16" />
    </div>
  );
}

function CardShimmer() {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <ShimmerBox className="h-4 w-3/4 mb-3" />
      <ShimmerBox className="h-3 w-1/2 mb-2" />
      <ShimmerBox className="h-3 w-2/3 mb-4" />
      <ShimmerBox className="h-8 w-full rounded-lg" />
    </div>
  );
}

function RowShimmer() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <ShimmerBox className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerBox className="h-3 w-1/3" />
        <ShimmerBox className="h-2.5 w-1/4" />
      </div>
      <ShimmerBox className="h-5 w-16" />
    </div>
  );
}

function TextShimmer() {
  return (
    <div className="space-y-2">
      <ShimmerBox className="h-3 w-full" />
      <ShimmerBox className="h-3 w-5/6" />
      <ShimmerBox className="h-3 w-4/6" />
    </div>
  );
}

export function LoadingShimmer({ variant = 'card', count = 1, className = '' }: LoadingShimmerProps) {
  const items = Array.from({ length: count });

  const renderItem = (i: number) => {
    switch (variant) {
      case 'kpi': return <KPIShimmer key={i} />;
      case 'row': return <RowShimmer key={i} />;
      case 'text': return <TextShimmer key={i} />;
      default: return <CardShimmer key={i} />;
    }
  };

  if (count === 1) return <div className={className}>{renderItem(0)}</div>;

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((_, i) => renderItem(i))}
    </div>
  );
}
