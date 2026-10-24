import { RUN_STATUS_LABEL } from '@groam/ai/backend/runs/ids';
import { Badge } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';

const DOT_CLASS = {
  aborted: 'bg-muted-foreground',
  complete: 'bg-current',
  failed: 'bg-destructive',
  queued: 'bg-muted-foreground',
  running: 'bg-current motion-safe:animate-pulse',
  waiting: 'bg-current'
} as const satisfies Record<keyof typeof RUN_STATUS_LABEL, string>;

const STATUS_CLASS = {
  aborted: '',
  complete: 'border-success/25 bg-success/10 text-success-foreground',
  failed: 'border-destructive/25 bg-destructive/10 text-foreground dark:text-destructive',
  queued: '',
  running: 'border-info/25 bg-info/10 text-info-foreground',
  waiting: 'border-warning/25 bg-warning/10 text-warning-foreground'
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
      <Badge className={className} variant="outline">
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        Idle
      </Badge>
    );
  }

  return (
    <Badge className={cn(STATUS_CLASS[status], className)} variant="outline">
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}
