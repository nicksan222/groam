import { ROSTER_STATUS_LABEL } from '@groam/ai-contracts/agents/runs/ids';
import { Badge, type BadgeVariant } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';

const BADGE_VARIANT = {
  failed: 'destructive',
  idle: 'outline',
  working: 'green'
} as const satisfies Record<keyof typeof ROSTER_STATUS_LABEL, BadgeVariant>;

const DOT_CLASS = {
  failed: 'bg-current',
  idle: 'bg-muted-foreground',
  working: 'bg-current motion-safe:animate-pulse'
} as const satisfies Record<keyof typeof ROSTER_STATUS_LABEL, string>;

export function AgentStatusBadge({ status }: { status: keyof typeof ROSTER_STATUS_LABEL }) {
  return (
    <Badge variant={BADGE_VARIANT[status]}>
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {ROSTER_STATUS_LABEL[status]}
    </Badge>
  );
}
