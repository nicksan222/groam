import { cn } from '@groam/ui/lib/utils';
import type { QueueItem, QueueTone } from '@/types/queue';

const toneClassName = {
  danger: 'text-destructive',
  info: 'text-info',
  neutral: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning'
} as const satisfies Record<QueueTone, string>;

/** The row's status as a tinted glyph, with its label for screen readers. */
export function QueueStatusIcon({ item }: { item: QueueItem }) {
  const Glyph = item.icon;
  return (
    <span
      className={cn('flex size-4 items-center justify-center', toneClassName[item.status.tone])}
      data-slot="queue-status"
    >
      <Glyph aria-hidden className="size-4" />
      <span className="sr-only">{item.status.label}. </span>
    </span>
  );
}
