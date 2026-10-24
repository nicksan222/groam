import { Badge } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';
import type { QueueItem, QueueTone } from '@/types/queue';

const toneClassName = {
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  info: 'border-info/25 bg-info/10 text-info-foreground',
  neutral: '',
  success: 'border-success/25 bg-success/10 text-success-foreground',
  warning: 'border-warning/25 bg-warning/10 text-warning-foreground'
} as const satisfies Record<QueueTone, string>;

/** An item's state as a tinted pill; the queues and Plan's "Your turn" strip share it. */
export function QueueStatusPill({ status }: { status: QueueItem['status'] }) {
  return (
    <Badge
      className={cn(
        'gap-2 border-border/60 bg-background/40 text-muted-foreground',
        toneClassName[status.tone]
      )}
      variant="outline"
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
      {status.label}
    </Badge>
  );
}
