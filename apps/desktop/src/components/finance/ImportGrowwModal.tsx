'use client';

import * as React from 'react';
import type { GrowwMFPreviewRow, GrowwStockPreviewRow } from '@pokimate/shared';
import { formatINR } from '@pokimate/shared';
import { useImportGrowwMF, useImportGrowwStocks } from '@/hooks/useInvestments';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImportGrowwModal({ open, onOpenChange }: Props) {
  const mfMutation = useImportGrowwMF();
  const stocksMutation = useImportGrowwStocks();

  const [mfFile, setMfFile] = React.useState<File | null>(null);
  const [stocksFile, setStocksFile] = React.useState<File | null>(null);
  const [mfPreview, setMfPreview] = React.useState<GrowwMFPreviewRow[] | null>(null);
  const [stocksPreview, setStocksPreview] = React.useState<GrowwStockPreviewRow[] | null>(null);
  const [mfImporting, setMfImporting] = React.useState(false);
  const [stocksImporting, setStocksImporting] = React.useState(false);

  const reset = () => {
    setMfFile(null);
    setStocksFile(null);
    setMfPreview(null);
    setStocksPreview(null);
  };

  const handleMFImport = async () => {
    if (!mfFile) return;
    setMfImporting(true);
    try {
      const b64 = await fileToBase64(mfFile);
      const rows = await mfMutation.mutateAsync({ file_b64: b64 });
      setMfPreview(rows);
      toast.success(`Imported ${rows.length} mutual fund holdings`);
    } catch {
      // already toasted
    } finally {
      setMfImporting(false);
    }
  };

  const handleStocksImport = async () => {
    if (!stocksFile) return;
    setStocksImporting(true);
    try {
      const b64 = await fileToBase64(stocksFile);
      const rows = await stocksMutation.mutateAsync({ file_b64: b64 });
      setStocksPreview(rows);
      toast.success(`Imported ${rows.length} stock holdings`);
    } catch {
      // already toasted
    } finally {
      setStocksImporting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { reset(); onOpenChange(false); }} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>Import from Groww</h2>
            <button onClick={() => { reset(); onOpenChange(false); }} className="px-2 text-xl hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>✕</button>
          </div>

          <div className="p-6 grid sm:grid-cols-2 gap-6">
            {/* MF Holdings card */}
            <ImportCard
              title="MF Holdings"
              emoji="📈"
              instructions={[
                'Open Groww app → Portfolio → Mutual Funds',
                'Tap the download icon → Export as XLSX',
                'Upload the downloaded file here',
              ]}
              file={mfFile}
              onFileChange={(f) => { setMfFile(f); setMfPreview(null); }}
              onImport={handleMFImport}
              importing={mfImporting}
              preview={mfPreview ? (
                <MFPreviewTable rows={mfPreview} />
              ) : null}
            />

            {/* Stock Holdings card */}
            <ImportCard
              title="Stock Holdings"
              emoji="📊"
              instructions={[
                'Open Groww app → Portfolio → Stocks',
                'Tap the download icon → Export as XLSX',
                'Upload the downloaded file here',
              ]}
              file={stocksFile}
              onFileChange={(f) => { setStocksFile(f); setStocksPreview(null); }}
              onImport={handleStocksImport}
              importing={stocksImporting}
              preview={stocksPreview ? (
                <StocksPreviewTable rows={stocksPreview} />
              ) : null}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function ImportCard({
  title, emoji, instructions, file, onFileChange, onImport, importing, preview
}: {
  title: string;
  emoji: string;
  instructions: string[];
  file: File | null;
  onFileChange: (f: File | null) => void;
  onImport: () => void;
  importing: boolean;
  preview: React.ReactNode;
}) {
  const inputId = `groww-file-${title.replace(/\s/g, '')}`;
  return (
    <div className="rounded-xl border p-4 space-y-3 flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h3>
      </div>
      <ol className="space-y-1">
        {instructions.map((step, i) => (
          <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <span className="font-bold" style={{ color: 'var(--primary)' }}>{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
      <div>
        <input
          type="file"
          accept=".xlsx,.xls"
          id={inputId}
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={inputId}
          className="block w-full text-center border-2 border-dashed rounded-lg py-3 cursor-pointer text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          {file ? file.name : '📎 Select XLSX file'}
        </label>
      </div>
      {file && !preview && (
        <button
          onClick={onImport}
          disabled={importing}
          className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}
        >
          {importing ? 'Importing…' : `Import ${title}`}
        </button>
      )}
      {preview && (
        <div className="mt-2">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--success, #16a34a)' }}>✅ Import complete</p>
          {preview}
        </div>
      )}
    </div>
  );
}

function MFPreviewTable({ rows }: { rows: GrowwMFPreviewRow[] }) {
  return (
    <div className="overflow-auto max-h-48">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--muted)' }}>
            <th className="text-left px-2 py-1" style={{ color: 'var(--foreground)' }}>Scheme</th>
            <th className="text-right px-2 py-1" style={{ color: 'var(--foreground)' }}>Invested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-2 py-1 max-w-xs truncate" style={{ color: 'var(--foreground)' }}>{r.scheme_name}</td>
              <td className="px-2 py-1 text-right" style={{ color: 'var(--foreground)' }}>{formatINR(BigInt(r.total_invested_minor))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StocksPreviewTable({ rows }: { rows: GrowwStockPreviewRow[] }) {
  return (
    <div className="overflow-auto max-h-48">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--muted)' }}>
            <th className="text-left px-2 py-1" style={{ color: 'var(--foreground)' }}>Symbol</th>
            <th className="text-right px-2 py-1" style={{ color: 'var(--foreground)' }}>Qty</th>
            <th className="text-right px-2 py-1" style={{ color: 'var(--foreground)' }}>Invested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-2 py-1 font-medium" style={{ color: 'var(--foreground)' }}>{r.symbol}</td>
              <td className="px-2 py-1 text-right" style={{ color: 'var(--muted-foreground)' }}>{r.quantity}</td>
              <td className="px-2 py-1 text-right" style={{ color: 'var(--foreground)' }}>{formatINR(BigInt(r.total_invested_minor))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
