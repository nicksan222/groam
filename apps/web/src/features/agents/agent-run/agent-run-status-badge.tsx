import { RUN_STATUS_LABEL } from '@groam/ai-contracts/agents/runs/ids';
import { Badge, type BadgeVariant } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';

const BADGE_VARIANT = {
  aborted: 'outline',
  complete: 'green',
  failed: 'outline',
  queued: 'secondary',
  running: 'green'
} as const satisfies Record<keyof typeof RUN_STATUS_LABEL, BadgeVariant>;

const DOT_CLASS = {
  aborted: 'bg-muted-foreground',
  complete: 'bg-current',
  failed: 'bg-current',
  queued: 'bg-muted-foreground',
  running: 'bg-current motion-safe:animate-pulse'
} as const satisfies Record<keyof typeof RUN_STATUS_LABEL, string>;

export function AgentRunStatusBadge({ status }: { status: keyof typeof RUN_STATUS_LABEL | null }) {
  if (!status) {
    return (
      <Badge variant="outline">
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        Idle
      </Badge>
    );
  }

  return (
    <Badge
      className={
        status === 'failed'
          ? 'border-destructive/20 bg-destructive/10 text-destructive-foreground'
          : undefined
      }
      variant={BADGE_VARIANT[status]}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}
