'use client';

import { useState, useRef, useEffect } from 'react';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  const initials = user.display_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadge =
    user.role === 'admin' ? (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--chart-5)] text-white">
        ADMIN
      </span>
    ) : user.role === 'demo' ? (
      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{ background: 'var(--chart-3)', color: 'var(--background)' }}
      >
        DEMO
      </span>
    ) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium truncate max-w-[120px]">
            {user.display_name}
          </div>
          {roleBadge}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border py-1 shadow-lg z-50"
          style={{ background: 'var(--card)' }}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate">{user.display_name}</p>
            <p className="text-xs text-muted-foreground">{user.username}</p>
            {roleBadge && <div className="mt-1">{roleBadge}</div>}
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <UserCircle size={14} /> Impersonate (Phase 7)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-destructive"
            onClick={handleLogout}
          >
            <SignOut size={14} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
