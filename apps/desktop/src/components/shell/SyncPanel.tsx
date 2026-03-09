'use client';

import { X } from 'lucide-react';

interface SyncPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SyncPanel({ open, onClose }: SyncPanelProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-[320px] border-l border-border shadow-lg flex flex-col"
        style={{ background: 'var(--card)' }}
        role="dialog"
        aria-label="Sync status"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Sync</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          Sync panel shell. Real sync logic in Phase 6.
        </div>
      </aside>
    </>
  );
}
