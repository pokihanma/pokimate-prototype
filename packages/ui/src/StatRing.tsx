'use client';

import * as React from 'react';

export interface StatRingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getColor(value: number): string {
  if (value >= 70) return 'var(--chart-2)'; // green
  if (value >= 40) return 'var(--chart-3)'; // amber
  return 'var(--chart-4)'; // red
}

export function StatRing({
  value,
  size = 80,
  strokeWidth = 8,
  className = '',
}: StatRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = React.useState(0);

  React.useEffect(() => {
    const offset = circumference - (clamped / 100) * circumference;
    setAnimatedOffset(offset);
  }, [clamped, circumference]);

  const color = getColor(clamped);

  return (
    <svg
      width={size}
      height={size}
      className={`transform -rotate-90 ${className}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={animatedOffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.5s ease-out',
        }}
      />
    </svg>
  );
}
