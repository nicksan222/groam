import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { CalendarClock } from '@groam/icons';
import { chip } from '@groam/ui/lib/chip';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';
import type { IssueStatus } from '@/types/issues';

const dueFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/**
 * A "decide by" date as a chip. Once it is past and the issue is still active it turns destructive
 * and says "Overdue · Oct 19". `label` writes the verb out ("Decide by Oct 25", "Closes Oct 25");
 * without it the verb is for screen readers only. `showDate={false}` drops the date from the overdue chip.
 */
export function IssueDueChip({
  dueAt,
  label,
  showDate = true,
  status
}: {
  dueAt: number;
  label?: string;
  /** Whether an overdue chip repeats the date; a place that already shows it says only "Overdue". */
  showDate?: boolean;
  status: IssueStatus;
}) {
  const overdue = !isResolved(status) && dueAt < Date.now();
  const date = dueFormatter.format(dueAt);
  return (
    <span
      className={cn(
        chip,
        'shrink-0 whitespace-nowrap',
        overdue && 'bg-destructive/15 text-destructive'
      )}
      data-overdue={overdue || undefined}
      data-testid={testIds.issueDueChip}
    >
      <CalendarClock aria-hidden className="size-3 shrink-0" />
      {overdue ? (
        <>
          <span className="sr-only">Decide by </span>
          {showDate ? `Overdue · ${date}` : 'Overdue'}
        </>
      ) : (
        <>
          {label ? `${label} ` : <span className="sr-only">Decide by </span>}
          {date}
        </>
      )}
    </span>
  );
}
