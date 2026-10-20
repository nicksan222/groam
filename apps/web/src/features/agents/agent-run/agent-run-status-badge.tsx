import { RUN_STATUS_LABEL } from '@groam/ai/backend/runs/ids';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { cn } from '@groam/ui/lib/utils';

const DOT_CLASS = {
  aborted: 'bg-muted-foreground',
  complete: 'bg-current',
  failed: 'bg-current',
  queued: 'bg-muted-foreground',
  running: 'bg-current motion-safe:animate-pulse',
  waiting: 'bg-current'
} as const satisfies Record<keyof typeof RUN_STATUS_LABEL, string>;

export function AgentRunStatusBadge({
  className,
  status
}: {
  className?: string;
  status: keyof typeof RUN_STATUS_LABEL | null;
}) {
  if (!status) {
    return (
      <RecordListBadge className={className}>
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        Idle
      </RecordListBadge>
    );
  }

  return (
    <RecordListBadge className={cn(status === 'failed' && 'text-destructive', className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {RUN_STATUS_LABEL[status]}
    </RecordListBadge>
  );
}
