'use client';

type SyncStatus = 'synced' | 'syncing' | 'disconnected' | 'conflicts';

interface SyncStatusBadgeProps {
  status?: SyncStatus;
  conflictCount?: number;
  onOpenPanel?: () => void;
}

export function SyncStatusBadge({
  status = 'disconnected',
  conflictCount = 0,
  onOpenPanel,
}: SyncStatusBadgeProps) {
  const label =
    status === 'synced'
      ? 'Synced'
      : status === 'syncing'
        ? 'Syncing...'
        : status === 'conflicts'
          ? `${conflictCount} Conflicts`
          : 'Not connected';

  const dotColor =
    status === 'synced'
      ? 'bg-[var(--chart-2)]'
      : status === 'syncing' || status === 'conflicts'
        ? 'bg-[var(--chart-3)]'
        : 'bg-muted-foreground';

  const showDot = status !== 'conflicts';

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted"
    >
      {status === 'conflicts' ? (
        <span className="text-[var(--chart-3)]" aria-hidden>⚠️</span>
      ) : (
        <span
          className={`h-2 w-2 rounded-full ${showDot ? dotColor : ''} ${status === 'disconnected' ? 'opacity-50' : ''}`}
        />
      )}
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}
