'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PiggyBank,
  CreditCard,
  TrendingUp,
  CheckSquare,
  Target,
  Clock,
  Repeat,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { APP_VERSION } from '@pokimate/shared';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/store/auth';

const navMain = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const financeItems = [
  { href: '/finance/transactions', label: 'Transactions', icon: Receipt },
  { href: '/finance/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/finance/debts', label: 'Debts', icon: CreditCard },
  { href: '/finance/investments', label: 'Investments', icon: TrendingUp },
];

const navRest = [
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/time', label: 'Time', icon: Clock },
  { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [financeOpen, setFinanceOpen] = useState(pathname.startsWith('/finance'));

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
      pathname === href
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground hover:bg-muted'
    }`;

  return (
    <aside
      className="flex flex-col border-r border-border h-full"
      style={{
        width: collapsed ? 64 : 240,
        background: 'var(--sidebar-background)',
        color: 'var(--sidebar-foreground)',
      }}
    >
      <div className="p-3 border-b border-border flex items-center gap-2 min-h-[56px]">
        <span className="text-xl font-bold truncate">⚡</span>
        {!collapsed && (
          <>
            <span className="font-semibold truncate">PokiMate</span>
            <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              v{APP_VERSION}
            </span>
          </>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto rounded p-1 hover:bg-muted"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navMain.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Finance accordion */}
        <div>
          <button
            type="button"
            onClick={() => setFinanceOpen((o) => !o)}
            className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
              pathname.startsWith('/finance')
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Wallet size={20} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Finance</span>
                {financeOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </>
            )}
          </button>
          {(!collapsed && financeOpen) && (
            <div className="ml-4 mt-1 space-y-0.5">
              {financeItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(href)}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {navRest.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="p-2 border-t border-border">
          <UserMenu />
        </div>
      )}
    </aside>
  );
}
