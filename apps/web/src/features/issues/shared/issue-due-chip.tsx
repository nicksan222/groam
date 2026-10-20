import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { CalendarClock } from '@groam/icons';
import { cardChip, cardChipTone } from '@groam/ui/lib/board-card';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';
import type { IssueStatus } from '@/types/issues';

const dueFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** A "decide by" date as a chip. Turns destructive once it is past and the issue is still active. */
export function IssueDueChip({ dueAt, status }: { dueAt: number; status: IssueStatus }) {
  const overdue = !isResolved(status) && dueAt < Date.now();
  return (
    <span
      className={cn(cardChip, overdue && cardChipTone.destructive)}
      data-overdue={overdue || undefined}
      data-testid={testIds.issueDueChip}
    >
      <CalendarClock aria-hidden className="size-3 shrink-0" />
      <span className="sr-only">Decide by </span>
      {dueFormatter.format(dueAt)}
      {overdue ? <span className="sr-only"> (overdue)</span> : null}
    </span>
  );
}
