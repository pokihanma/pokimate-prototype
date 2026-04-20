'use client';

import { useTheme } from 'next-themes';
import { Sun, Monitor, Moon } from '@phosphor-icons/react';

type ThemeMode = 'light' | 'system' | 'dark';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const current = (theme ?? 'system') as ThemeMode;
  const modes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  ];

  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setTheme(m.value)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm ${
            current === m.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-foreground hover:bg-muted'
          }`}
          title={m.label}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
