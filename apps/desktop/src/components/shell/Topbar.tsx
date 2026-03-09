'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SyncStatusBadge } from './SyncStatusBadge';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  syncOpen: () => void;
  notificationOpen: () => void;
}

const routeTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  finance: 'Finance',
  'finance/transactions': 'Transactions',
  'finance/budgets': 'Budgets',
  'finance/debts': 'Debts',
  'finance/investments': 'Investments',
  habits: 'Habits',
  goals: 'Goals',
  time: 'Time',
  subscriptions: 'Subscriptions',
  settings: 'Settings',
};

function getBreadcrumb(pathname: string): { path: string; label: string }[] {
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const out: { path: string; label: string }[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += (acc ? '/' : '') + seg;
    out.push({ path: '/' + acc, label: routeTitles[seg] ?? seg });
  }
  return out;
}

export function Topbar({ syncOpen, notificationOpen }: TopbarProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);
  const title = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].label : 'Dashboard';

  return (
    <header
      className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0"
      style={{ background: 'var(--card)' }}
    >
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-lg">{title}</h1>
        {breadcrumb.length > 1 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map(({ path, label }, i) => (
              <span key={path} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <Link href={path} className="hover:text-foreground">
                  {label}
                </Link>
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1">
        <SyncStatusBadge status="synced" onOpenPanel={syncOpen} />
        <NotificationBell count={0} onOpen={notificationOpen} />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
