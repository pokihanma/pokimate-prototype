'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  Wallet,
  Bank,
  Receipt,
  PiggyBank,
  CreditCard,
  TrendUp,
  CheckSquare,
  Target,
  Timer,
  ArrowsClockwise,
  Gear,
  CaretDown,
  CaretRight,
  ArrowLineLeft,
  ArrowLineRight,
} from '@phosphor-icons/react';
import { APP_VERSION } from '@pokimate/shared';
import { useAuthStore } from '@/store/auth';

const navMain = [
  { href: '/dashboard', label: 'Dashboard', icon: SquaresFour },
];

const financeItems = [
  { href: '/finance/accounts',     label: 'Accounts',     icon: Bank },
  { href: '/finance/transactions', label: 'Transactions', icon: Receipt },
  { href: '/finance/budgets',      label: 'Budgets',      icon: PiggyBank },
  { href: '/finance/debts',        label: 'Debts',        icon: CreditCard },
  { href: '/finance/investments',  label: 'Investments',  icon: TrendUp },
];

const navRest = [
  { href: '/habits',        label: 'Habits',        icon: CheckSquare },
  { href: '/goals',         label: 'Goals',         icon: Target },
  { href: '/time',          label: 'Time',          icon: Timer },
  { href: '/subscriptions', label: 'Subscriptions', icon: ArrowsClockwise },
  { href: '/settings',      label: 'Settings',      icon: Gear },
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
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 border-b"
        style={{ borderColor: 'var(--border)', minHeight: 56 }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 32, height: 32, background: 'var(--primary)', boxShadow: '0 0 12px var(--primary-glow)' }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--foreground)' }}>PokiMate</div>
            <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>v{APP_VERSION}</div>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 flex-shrink-0 ml-auto"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ArrowLineRight size={16} weight="bold" />
              : <ArrowLineLeft size={16} weight="bold" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navMain.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={<Icon size={18} weight={isActive(href) ? 'fill' : 'regular'} />} active={isActive(href)} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <div className="px-2.5 pt-4 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Finance</span>
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
            onMouseEnter={e => { if (!isFinanceActive) { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'; } }}
            onMouseLeave={e => { if (!isFinanceActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; } }}
          >
            <Wallet size={18} weight={isFinanceActive ? 'fill' : 'regular'} className="flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Finance</span>
                {financeOpen ? <CaretDown size={13} weight="bold" /> : <CaretRight size={13} weight="bold" />}
              </>
            )}
          </button>
          {!collapsed && financeOpen && (
            <div className="ml-3 mt-0.5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--border)' }}>
              {financeItems.map(({ href, label, icon: Icon }) => (
                <NavLink key={href} href={href} label={label} icon={<Icon size={14} weight={isActive(href) ? 'fill' : 'regular'} />} active={isActive(href)} collapsed={false} small />
              ))}
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="px-2.5 pt-4 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Life</span>
          </div>
        )}

        {navRest.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={<Icon size={18} weight={isActive(href) ? 'fill' : 'regular'} />} active={isActive(href)} collapsed={collapsed} />
        ))}
      </nav>

      {/* User info (logout is in topbar) */}
      {user && !collapsed && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-1">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {(user.display_name ?? user.username).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{user.display_name ?? user.username}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Shared nav link ───────────────────────────────────────────────────────────

function NavLink({ href, label, icon, active, collapsed, small = false }: {
  href: string; label: string; icon: React.ReactNode;
  active: boolean; collapsed: boolean; small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg ${small ? 'px-2.5 py-1.5' : 'px-2.5 py-2'} ${small ? 'text-xs' : 'text-sm'} font-medium transition-colors`}
      style={{
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
        boxShadow: active ? '0 2px 8px var(--primary-glow)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
          (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
        }
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
