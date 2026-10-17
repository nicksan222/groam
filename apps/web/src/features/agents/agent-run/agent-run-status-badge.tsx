import { RUN_STATUS_LABEL } from '@groam/ai/backend/runs/ids';
import { Badge, type BadgeVariant } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';

const BADGE_VARIANT = {
  aborted: 'outline',
  complete: 'green',
  failed: 'outline',
  queued: 'secondary',
  running: 'green',
  waiting: 'secondary'
} as const satisfies Record<keyof typeof RUN_STATUS_LABEL, BadgeVariant>;

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
      <Badge className={className} variant="outline">
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        Idle
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        status === 'failed' && 'border-destructive/20 bg-destructive/10 text-destructive',
        className
      )}
      variant={BADGE_VARIANT[status]}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}
