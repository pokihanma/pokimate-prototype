// Design tokens — mirrors desktop globals.css dark theme
export const colors = {
  background:   '#080b14',
  card:         '#0e1320',
  cardElevated: '#131827',
  border:       'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  primary:      '#6366f1',
  primaryGlow:  'rgba(99,102,241,0.2)',
  primaryMuted: 'rgba(99,102,241,0.12)',
  muted:        '#131827',
  foreground:   '#eef0ff',
  mutedFg:      '#636b8a',
  success:      '#10b981',
  successMuted: 'rgba(16,185,129,0.12)',
  warning:      '#f59e0b',
  warningMuted: 'rgba(245,158,11,0.12)',
  destructive:  '#f43f5e',
  destructiveMuted: 'rgba(244,63,94,0.12)',
  info:         '#38bdf8',
  chart1:       '#6366f1',
  chart2:       '#10b981',
  chart3:       '#f59e0b',
  chart4:       '#f43f5e',
  chart5:       '#a78bfa',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  full: 9999,
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
} as const;

// Preset habit/goal colors
export const presetColors = [
  '#5b6cf9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
