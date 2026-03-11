'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ParsedStatement, ParsedBankRow, ConfirmedRow, FinanceAccount, Category } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';
import { formatINR } from '@pokimate/shared';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: FinanceAccount[];
  categories: Category[];
}

type Step = 1 | 2 | 3 | 4;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data URI prefix: "data:...;base64,"
      const b64 = result.split(',')[1] ?? result;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_COLORS: Record<string, string> = {
  new: 'var(--success, #16a34a)',
  duplicate: 'var(--warning, #d97706)',
  uncategorized: 'var(--muted-foreground)',
};

export function BankImportWizard({ open, onOpenChange, accounts, categories }: Props) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [step, setStep] = React.useState<Step>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedStatement | null>(null);
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? '');
  const [rows, setRows] = React.useState<ParsedBankRow[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'duplicates' | 'uncategorized'>('all');
  const [confirming, setConfirming] = React.useState(false);

  const expenseCategories = categories.filter((c) => c.type_ === 'expense');
  const incomeCategories = categories.filter((c) => c.type_ === 'income');

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsed(null);
    setRows([]);
    setFilter('all');
    setAccountId(accounts[0]?.id ?? '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleParse = async () => {
    if (!file || !user) return;
    setParsing(true);
    try {
      const b64 = await fileToBase64(file);
      const result = await invokeWithToast<ParsedStatement>('parse_bank_statement', {
        user_id: user.user_id,
        file_name: file.name,
        file_b64: b64,
      });
      setParsed(result);
      setRows(result.rows);
      setStep(result.needs_mapping ? 2 : 3);
    } catch {
      // error already toasted by invokeWithToast
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed || !user) return;
    setConfirming(true);
    try {
      const confirmedRows: ConfirmedRow[] = rows.map((r) => ({
        row_index: r.row_index,
        txn_date: r.txn_date,
        description: r.description,
        amount_minor: r.amount_minor,
        txn_type: r.txn_type,
        category_id: r.category_id,
        skip: r.status === 'duplicate',
      }));
      const inserted = await invokeWithToast<number>('confirm_bank_import', {
        user_id: user.user_id,
        job_id: parsed.job_id,
        account_id: accountId,
        rows: confirmedRows,
      });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Imported ${inserted} transactions successfully`);
      reset();
      onOpenChange(false);
    } catch {
      // already toasted
    } finally {
      setConfirming(false);
    }
  };

  const setCategoryForRow = (rowIndex: number, catId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.row_index === rowIndex
          ? { ...r, category_id: catId || null, status: catId ? 'new' : 'uncategorized' }
          : r
      )
    );
  };

  const filteredRows = rows.filter((r) => {
    if (filter === 'duplicates') return r.status === 'duplicate';
    if (filter === 'uncategorized') return r.status === 'uncategorized';
    return true;
  });

  const counts = {
    all: rows.length,
    duplicates: rows.filter((r) => r.status === 'duplicate').length,
    uncategorized: rows.filter((r) => r.status === 'uncategorized').length,
    new: rows.filter((r) => r.status === 'new').length,
  };

  if (!open) return null;

  const inputCls = 'w-full rounded-md border px-3 py-2 text-sm outline-none';
  const inputStyle = { background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => { reset(); onOpenChange(false); }} />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>Import Bank Statement</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Step {step} of 4</p>
          </div>
          <button onClick={() => { reset(); onOpenChange(false); }} className="px-2 text-xl hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 py-3 gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
          {(['Upload', 'Mapping', 'Review', 'Confirm'] as const).map((label, i) => {
            const s = (i + 1) as Step;
            const active = step === s;
            const done = step > s;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: done ? 'var(--success, #16a34a)' : active ? 'var(--primary)' : 'var(--muted)',
                    color: done || active ? '#fff' : 'var(--muted-foreground)',
                  }}
                >
                  {done ? '✓' : s}
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{label}</span>
                {i < 3 && <div className="w-8 h-px" style={{ background: 'var(--border)' }} />}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1 — Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Upload your bank statement (.xlsx, .xls, or .csv). Supported banks: HDFC, SBI, ICICI, Axis, Kotak.
              </p>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center"
                style={{ borderColor: 'var(--border)' }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bank-file-input"
                />
                <label htmlFor="bank-file-input" className="cursor-pointer space-y-2 block">
                  <div className="text-3xl">📂</div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {file ? file.name : 'Click to select file'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>XLSX, XLS or CSV</p>
                </label>
              </div>
              {file && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Import to Account</label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} style={inputStyle}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Column Mapping (fallback when bank not detected) */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Bank format not auto-detected. The file has been parsed with best-guess column mapping. Review below and proceed.
              </p>
              {parsed && (
                <div className="rounded-lg border p-4 space-y-1" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm"><span className="font-medium">File:</span> {file?.name}</p>
                  <p className="text-sm"><span className="font-medium">Rows detected:</span> {parsed.row_count}</p>
                  <p className="text-sm"><span className="font-medium">Bank:</span> Unknown — using generic mapping</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              {parsed && (
                <div className="flex gap-4 text-sm flex-wrap">
                  <span style={{ color: 'var(--success, #16a34a)' }}>✅ {counts.new} new</span>
                  <span style={{ color: 'var(--warning, #d97706)' }}>⚠️ {counts.duplicates} duplicates</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>❓ {counts.uncategorized} uncategorized</span>
                  {parsed.bank_name && (
                    <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium text-white" style={{ background: 'var(--primary)' }}>
                      {parsed.bank_name}
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                {(['all', 'duplicates', 'uncategorized'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-full text-xs capitalize"
                    style={{
                      background: filter === f ? 'var(--primary)' : 'var(--muted)',
                      color: filter === f ? '#fff' : 'var(--foreground)',
                    }}
                  >
                    {f} ({f === 'all' ? counts.all : counts[f]})
                  </button>
                ))}
              </div>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--muted)' }}>
                      {['Status', 'Date', 'Description', 'Amount', 'Category'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => {
                      const cats = r.txn_type === 'income' ? incomeCategories : expenseCategories;
                      return (
                        <tr key={r.row_index} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: STATUS_COLORS[r.status] + '22', color: STATUS_COLORS[r.status] }}>
                              {r.status === 'new' ? '✅ New' : r.status === 'duplicate' ? '⚠️ Dup' : '❓ Uncat'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{r.txn_date}</td>
                          <td className="px-3 py-2 max-w-xs truncate" style={{ color: 'var(--foreground)' }}>{r.description}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium"
                            style={{ color: r.txn_type === 'income' ? 'var(--success, #16a34a)' : 'var(--destructive)' }}>
                            {r.txn_type === 'income' ? '+' : '-'}{formatINR(BigInt(r.amount_minor))}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={r.category_id ?? ''}
                              onChange={(e) => setCategoryForRow(r.row_index, e.target.value)}
                              className="rounded border px-2 py-1 text-xs"
                              style={{ ...inputStyle, minWidth: 120 }}
                            >
                              <option value="">— none —</option>
                              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRows.length === 0 && (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>No rows in this filter.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>Ready to import</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>New transactions</span>
                    <span className="font-medium" style={{ color: 'var(--success, #16a34a)' }}>{counts.new}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>Duplicates (skipped)</span>
                    <span className="font-medium" style={{ color: 'var(--warning, #d97706)' }}>{counts.duplicates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>Target account</span>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {accounts.find((a) => a.id === accountId)?.name ?? accountId}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Click "Confirm Import" to add {counts.new} new transactions to your account.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="px-4 py-2 rounded-md border text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          {step === 1 && (
            <button
              onClick={handleParse}
              disabled={!file || parsing}
              className="px-6 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {parsing ? 'Parsing…' : 'Parse File →'}
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              Review →
            </button>
          )}
          {step === 3 && (
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              Continue →
            </button>
          )}
          {step === 4 && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-6 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--success, #16a34a)' }}
            >
              {confirming ? 'Importing…' : 'Confirm Import'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
