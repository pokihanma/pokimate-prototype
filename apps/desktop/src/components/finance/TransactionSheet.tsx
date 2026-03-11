'use client';

import * as React from 'react';
import { MoneyInput } from '@pokimate/ui';
import type { FinanceTransaction, Category, FinanceAccount } from '@pokimate/shared';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  accounts: FinanceAccount[];
  editing?: FinanceTransaction | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionSheet({ open, onOpenChange, categories, accounts, editing }: Props) {
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const [type_, setType_] = React.useState<'income' | 'expense'>(
    (editing?.type_ as 'income' | 'expense') ?? 'expense'
  );
  const [amountPaise, setAmountPaise] = React.useState<bigint>(
    editing ? BigInt(editing.amount_minor) : BigInt(0)
  );
  const [categoryId, setCategoryId] = React.useState<string>(editing?.category_id ?? '');
  const [merchant, setMerchant] = React.useState(editing?.merchant ?? '');
  const [txnDate, setTxnDate] = React.useState(editing?.txn_date ?? today());
  const [accountId, setAccountId] = React.useState(editing?.account_id ?? accounts[0]?.id ?? '');
  const [note, setNote] = React.useState(editing?.note ?? '');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setType_((editing.type_ as 'income' | 'expense') ?? 'expense');
      setAmountPaise(BigInt(editing.amount_minor));
      setCategoryId(editing.category_id ?? '');
      setMerchant(editing.merchant ?? '');
      setTxnDate(editing.txn_date ?? today());
      setAccountId(editing.account_id ?? accounts[0]?.id ?? '');
      setNote(editing.note ?? '');
    } else {
      setType_('expense');
      setAmountPaise(BigInt(0));
      setCategoryId('');
      setMerchant('');
      setTxnDate(today());
      setAccountId(accounts[0]?.id ?? '');
      setNote('');
    }
  }, [editing, accounts]);

  const filteredCategories = categories.filter((c) => c.type_ === type_);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          category_id: categoryId || null,
          merchant: merchant || null,
          note: note || null,
          txn_date: txnDate,
        });
      } else {
        await createMutation.mutateAsync({
          account_id: accountId,
          category_id: categoryId || null,
          type_,
          amount_minor: Number(amountPaise),
          merchant: merchant || null,
          note: note || null,
          txn_date: txnDate,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputCls = 'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1';
  const inputStyle = {
    background: 'var(--background)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
    focusRingColor: 'var(--primary)',
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => onOpenChange(false)} />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
            {editing ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-xl leading-none px-2 hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType_(t); setCategoryId(''); }}
                className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
                style={{
                  background: type_ === t
                    ? t === 'expense' ? 'var(--destructive)' : 'var(--success, #16a34a)'
                    : 'var(--background)',
                  color: type_ === t ? '#fff' : 'var(--foreground)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Amount (₹)</label>
            <MoneyInput
              valuePaise={amountPaise}
              onChange={setAmountPaise}
              placeholder="0.00"
              className={`${inputCls} text-base font-semibold`}
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">— Select category —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Merchant */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Swiggy, Amazon…"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Date</label>
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Account */}
          {!editing && (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Note <span style={{ color: 'var(--muted-foreground)' }}>(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional note…"
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2 rounded-md border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting || amountPaise === BigInt(0)}
            className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </aside>
    </>
  );
}
