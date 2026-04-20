'use client';

import { usePathname } from 'next/navigation';
import { SyncStatusBadge } from './SyncStatusBadge';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useTopbarActions } from './TopbarActionsContext';

const PAGE_TITLES: Record<string, { title: string; breadcrumb?: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/finance/accounts': { title: 'Accounts', breadcrumb: 'Finance / accounts' },
  '/finance/transactions': { title: 'Transactions', breadcrumb: 'Finance / transactions' },
  '/finance/budgets': { title: 'Budgets', breadcrumb: 'Finance / budgets' },
  '/finance/debts': { title: 'Debts', breadcrumb: 'Finance / debts' },
  '/finance/investments': { title: 'Investments', breadcrumb: 'Finance / investments' },
  '/habits': { title: 'Habits' },
  '/goals': { title: 'Goals' },
  '/time': { title: 'Time Tracker' },
  '/subscriptions': { title: 'Subscriptions' },
  '/settings': { title: 'Settings' },
};

export function Topbar() {
  const pathname = usePathname();
  const { actions } = useTopbarActions();

  const pageInfo = PAGE_TITLES[pathname] ?? { title: pathname.split('/').pop() ?? 'PokiMate' };

  return (
    <header
      className="flex items-center gap-4 px-4 border-b"
      style={{
        height: 56,
        background: 'var(--background)',
        borderColor: 'var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            {pageInfo.title}
          </h1>
          {pageInfo.breadcrumb && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--muted-foreground)' }}>
              {pageInfo.breadcrumb}
            </span>
          )}
        </div>
      </div>

      {/* Injected page actions (e.g. + Add button) */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <SyncStatusBadge />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
