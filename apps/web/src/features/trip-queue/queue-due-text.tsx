import { cn } from '@groam/ui/lib/utils';
import type { QueueKind } from '@/types/queue';

const dueFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const week = 7 * 86_400_000;

/**
 * An open item's due date in plain words: "Decide by Oct 28", "Closes Oct 27". Within a week it
 * turns warning; once past it says "Overdue · Oct 19" in destructive.
 */
export function QueueDueText({ dueAt, kind }: { dueAt: number; kind: QueueKind }) {
  const remaining = dueAt - Date.now();
  const overdue = remaining < 0;
  const date = dueFormatter.format(dueAt);
  return (
    <span
      className={cn(
        'whitespace-nowrap text-xs text-muted-foreground',
        remaining <= week && !overdue && 'font-medium text-warning-foreground',
        overdue && 'font-medium text-destructive'
      )}
      data-overdue={overdue || undefined}
    >
      {overdue ? `Overdue · ${date}` : `${kind === 'poll' ? 'Closes' : 'Decide by'} ${date}`}
    </span>
  );
}
