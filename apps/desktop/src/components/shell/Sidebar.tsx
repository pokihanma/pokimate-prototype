'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, Landmark, Receipt, PiggyBank,
  CreditCard, TrendingUp, CheckSquare, Target, Clock,
  Repeat, Settings, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { APP_VERSION } from '@pokimate/shared';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/store/auth';

const navMain = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const financeItems = [
  { href: '/finance/accounts', label: 'Accounts', icon: Landmark },
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

  const isActive = (href: string) => pathname === href;
  const isFinanceActive = pathname.startsWith('/finance');

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{
        width: collapsed ? 64 : 240,
        background: 'var(--sidebar-background)',
        borderColor: 'var(--border)',
        transition: 'width 0.2s ease',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 border-b"
        style={{ borderColor: 'var(--border)', minHeight: 56 }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: 'var(--primary)',
            boxShadow: '0 0 12px var(--primary-glow)',
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                PokiMate
              </div>
              <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                v{APP_VERSION}
              </div>
            </div>
          </>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 flex-shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navMain.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
            style={{
              background: isActive(href) ? 'var(--primary)' : 'transparent',
              color: isActive(href) ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              boxShadow: isActive(href) ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
                (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
              }
            }}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}

        {/* Section label */}
        {!collapsed && (
          <div className="px-2.5 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Finance
            </span>
          </div>
        )}

        {/* Finance accordion */}
        <div>
          <button
            type="button"
            onClick={() => setFinanceOpen((o) => !o)}
            className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
            style={{
              background: isFinanceActive ? 'var(--accent)' : 'transparent',
              color: isFinanceActive ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            <Wallet size={18} className="flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Finance</span>
                {financeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </>
            )}
          </button>
          {!collapsed && financeOpen && (
            <div className="ml-3 mt-0.5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--border)' }}>
              {financeItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: isActive(href) ? 'var(--primary)' : 'transparent',
                    color: isActive(href) ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive(href)) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive(href)) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                    }
                  }}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="px-2.5 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Life
            </span>
          </div>
        )}

        {navRest.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
            style={{
              background: isActive(href) ? 'var(--primary)' : 'transparent',
              color: isActive(href) ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              boxShadow: isActive(href) ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
                (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
              }
            }}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* User area */}
      {user && (
        <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <UserMenu collapsed={collapsed} />
        </div>
      )}
    </aside>
  );
}
