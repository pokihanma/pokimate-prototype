'use client';

import * as React from 'react';
import { Landmark } from 'lucide-react';
import { MoneyDisplay, MoneyInput, LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import type { FinanceAccount } from '@pokimate/shared';
import { useFinanceAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useFinanceAccounts';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'checking', label: 'Checking / Current' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
] as const;

function accountTypeLabel(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function accountTypeBadgeStyle(type: string): React.CSSProperties {
  const map: Record<string, string> = {
    savings: 'var(--chart-2)',
    checking: 'var(--chart-1)',
    credit: 'var(--destructive)',
    cash: 'var(--chart-3)',
    investment: 'var(--chart-4)',
    loan: 'var(--chart-5)',
  };
  return {
    background: (map[type] ?? 'var(--muted)') + '33',
    color: map[type] ?? 'var(--muted-foreground)',
  };
}

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
  const createMutation = useCreateAccount();
  const [name, setName] = React.useState('');
  const [accountType, setAccountType] = React.useState<string>('savings');
  const [bankName, setBankName] = React.useState('');
  const [openingBalancePaise, setOpeningBalancePaise] = React.useState<bigint>(BigInt(0));
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setName('');
    setAccountType('savings');
    setBankName('');
    setOpeningBalancePaise(BigInt(0));
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        name: bankName.trim() ? `${bankName.trim()} — ${name.trim()}` : name.trim(),
        account_type: accountType,
        opening_balance_minor: Number(openingBalancePaise),
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputCls = 'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1';
  const inputStyle: React.CSSProperties = {
    background: 'var(--background)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={handleClose} />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
            Add Account
          </h2>
          <button
            onClick={handleClose}
            className="text-xl leading-none px-2 hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Account Name <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary Savings, Wallet…"
              required
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Account Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Account Type <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Name (optional, display-only — combined with account name on save) */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Bank Name{' '}
              <span style={{ color: 'var(--muted-foreground)' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC, SBI, ICICI…"
              className={inputCls}
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              If provided, saved as &quot;Bank — Name&quot; (e.g. HDFC — Savings)
            </p>
          </div>

          {/* Opening Balance */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Opening Balance (₹){' '}
              <span style={{ color: 'var(--muted-foreground)' }}>(optional)</span>
            </label>
            <MoneyInput
              valuePaise={openingBalancePaise}
              onChange={setOpeningBalancePaise}
              placeholder="0.00"
              className={`${inputCls} text-base`}
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 rounded-md border text-sm"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              background: 'var(--background)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting || !name.trim()}
            className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {submitting ? 'Saving…' : 'Add Account'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useFinanceAccounts();
  const deleteMutation = useDeleteAccount();
  const { setActions } = useTopbarActions();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FinanceAccount | null>(null);

  React.useEffect(() => {
    setActions(
      <button
        onClick={() => setSheetOpen(true)}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
        style={{ background: 'var(--primary)' }}
      >
        + Add Account
      </button>
    );
    return () => setActions(null);
  }, [setActions]);

  const activeAccounts = accounts.filter((a) => !a.deleted_at);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + BigInt(a.balance_minor), BigInt(0));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Accounts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {activeAccounts.length} account{activeAccounts.length !== 1 ? 's' : ''} · Total:{' '}
            <MoneyDisplay paise={totalBalance} />
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingShimmer key={i} variant="card" />
          ))}
        </div>
      ) : activeAccounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={48} />}
          title="No accounts yet"
          description="Add your first bank account, wallet, or credit card to start tracking."
          action={
            <button
              onClick={() => setSheetOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              + Add Account
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeAccounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border p-5 flex flex-col gap-3"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-base truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {account.name}
                  </p>
                  <span
                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                    style={accountTypeBadgeStyle(account.account_type)}
                  >
                    {accountTypeLabel(account.account_type)}
                  </span>
                </div>
                <button
                  onClick={() => setDeleteTarget(account)}
                  className="shrink-0 px-2 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                  title="Delete account"
                >
                  🗑
                </button>
              </div>

              <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Balance
                </p>
                <p
                  className="text-xl font-bold"
                  style={{
                    color:
                      account.balance_minor >= 0
                        ? 'var(--success, #16a34a)'
                        : 'var(--destructive)',
                  }}
                >
                  <MoneyDisplay paise={BigInt(account.balance_minor)} />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Delete Account"
        description="This account will be hidden for 30 days. Recover from Settings → Deleted items. Transactions linked to this account will remain."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
