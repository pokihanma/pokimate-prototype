'use client';

import { Bell } from '@phosphor-icons/react';

interface NotificationBellProps {
  count?: number;
  onOpen?: () => void;
}

export function NotificationBell({ count = 0, onOpen }: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative rounded-md p-2 hover:bg-muted"
      aria-label={count ? `${count} notifications` : 'Notifications'}
    >
      <Bell size={20} className="text-foreground" />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white"
          style={{ background: 'var(--destructive)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
