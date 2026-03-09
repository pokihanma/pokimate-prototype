import * as React from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-hidden="true"
      >
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => onOpenChange(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          className="relative z-50 w-full max-w-sm rounded-lg border p-6 shadow-lg"
          style={{
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            borderColor: 'var(--border)',
          }}
        >
          <h2 id="confirm-dialog-title" className="font-semibold text-lg">
            {title}
          </h2>
          <p
            id="confirm-dialog-desc"
            className="mt-2 text-sm"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {description}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-md border hover:opacity-90"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-md text-white hover:opacity-90"
              style={{
                background: destructive ? 'var(--destructive)' : 'var(--primary)',
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
