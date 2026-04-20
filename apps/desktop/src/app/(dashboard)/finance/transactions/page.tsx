'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, MoneyDisplay, LoadingShimmer, EmptyState, ConfirmDialog } from '@pokimate/ui';
import { Wallet } from '@phosphor-icons/react';
import type { FinanceTransaction, Category, FinanceAccount } from '@pokimate/shared';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useTopbarActions } from '@/components/shell/TopbarActionsContext';
import { TransactionSheet } from '@/components/finance/TransactionSheet';
import { BankImportWizard } from '@/components/finance/BankImportWizard';
import { useAuthStore } from '@/store/auth';

function monthRange(month: string): { from_date: string; to_date: string } {
  const [year, mon] = month.split('-').map(Number);
  const last = new Date(year, mon, 0).getDate();
  return { from_date: `${month}-01`, to_date: `${month}-${String(last).padStart(2, '0')}` };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isWithin30Days(deletedAt: string | null | undefined): boolean {
  if (!deletedAt) return false;
  const del = new Date(deletedAt);
  const now = new Date();
  return (now.getTime() - del.getTime()) < 30 * 24 * 60 * 60 * 1000;
}

export default function TransactionsPage() {
  const user = useAuthStore((s) => s.user);
  const [month, setMonth] = React.useState(currentMonth());
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editTxn, setEditTxn] = React.useState<FinanceTransaction | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FinanceTransaction | null>(null);

  const { from_date, to_date } = monthRange(month);
  const { data: allTxns = [], isLoading } = useTransactions({ from_date, to_date });
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useFinanceAccounts();
  const deleteMutation = useDeleteTransaction();
  const { setActions } = useTopbarActions();

  React.useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <button
          onClick={() => setImportOpen(true)}
          className="px-3 py-1.5 rounded-md border text-sm flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}
        >
          ↑ Import
        </button>
        <button
          onClick={() => { setEditTxn(null); setSheetOpen(true); }}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
          style={{ background: 'var(--primary)' }}
        >
          + Add
        </button>
      </div>
    );
    return () => setActions(null);
  }, [setActions]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  const displayTxns = React.useMemo(() => {
    return allTxns.filter((t) => {
      if (typeFilter !== 'all' && t.type_ !== typeFilter) return false;
      if (categoryFilter && t.category_id !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.merchant?.toLowerCase().includes(q) &&
          !t.note?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allTxns, typeFilter, categoryFilter, search]);

  const columns: ColumnDef<FinanceTransaction>[] = [
    {
      accessorKey: 'txn_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {row.original.txn_date}
        </span>
      ),
    },
    {
      accessorKey: 'merchant',
      header: 'Merchant',
      cell: ({ row }) => {
        const t = row.original;
        const isDeleted = !!t.deleted_at;
        return (
          <span
            className={isDeleted ? 'line-through opacity-60' : ''}
            style={{ color: 'var(--foreground)' }}
          >
            {t.merchant || t.note || '—'}
            {isDeleted && isWithin30Days(t.deleted_at) && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                Deleted
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'category_id',
      header: 'Category',
      cell: ({ row }) => {
        const cat = catMap.get(row.original.category_id ?? '');
        if (!cat) return <span style={{ color: 'var(--muted-foreground)' }}>—</span>;
        return (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: cat.color + '33', color: cat.color }}
          >
            {cat.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'account_id',
      header: 'Account',
      cell: ({ row }) => {
        const acc = accMap.get(row.original.account_id);
        return (
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {acc?.name ?? '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount_minor',
      header: 'Amount',
      cell: ({ row }) => {
        const t = row.original;
        const isIncome = t.type_ === 'income';
        return (
          <span
            className="font-semibold text-sm"
            style={{ color: isIncome ? 'var(--success, #16a34a)' : 'var(--destructive)' }}
          >
            {isIncome ? '+' : '-'}
            <MoneyDisplay paise={BigInt(t.amount_minor)} />
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const t = row.original;
        if (t.deleted_at) return null;
        return (
          <div className="flex gap-1 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); setEditTxn(t); setSheetOpen(true); }}
              className="px-2 py-1 rounded text-xs"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
              className="px-2 py-1 rounded text-xs"
              style={{ background: 'var(--destructive)', color: '#fff' }}
            >
              🗑
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Transactions</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {displayTxns.length} transaction{displayTxns.length !== 1 ? 's' : ''} this period
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 text-xs capitalize"
              style={{
                background: typeFilter === t ? 'var(--primary)' : 'var(--background)',
                color: typeFilter === t ? '#fff' : 'var(--foreground)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant / note…"
          className="rounded-md border px-3 py-1.5 text-sm flex-1 min-w-40"
          style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingShimmer key={i} variant="row" />
          ))}
        </div>
      ) : displayTxns.length === 0 ? (
        <EmptyState
          icon={<Wallet size={48} />}
          title="No transactions"
          description="Add your first transaction or import a bank statement."
          action={
            <button
              onClick={() => { setEditTxn(null); setSheetOpen(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              + Add Transaction
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={displayTxns}
          onRowClick={(row) => { if (!row.deleted_at) { setEditTxn(row); setSheetOpen(true); } }}
        />
      )}

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditTxn(null); }}
        categories={categories}
        accounts={accounts}
        editing={editTxn}
      />

      <BankImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Transaction"
        description="This transaction will be hidden for 30 days. Recover from Settings → Deleted items."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}
