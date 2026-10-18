import { Progress } from '@groam/ui/components/progress';
import type { TripBoardIssue } from '@/types/trip-board';

/** How many of the issues every trip needs settled are done. Hidden when the trip has none. */
export function TripBoardMandatoryProgress({ issues }: { issues: TripBoardIssue[] | undefined }) {
  const mandatory = issues?.filter((issue) => issue.labels.includes('mandatory')) ?? [];
  if (mandatory.length === 0) return null;
  const done = mandatory.filter((issue) => issue.status === 'closed').length;
  const summary = `${done} of ${mandatory.length} mandatory done`;
  return (
    <div className="flex flex-col gap-1.5">
      <Progress
        aria-label="Mandatory issues"
        aria-valuetext={summary}
        className="h-1.5"
        value={(done / mandatory.length) * 100}
      />
      <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">
        {summary}
      </span>
    </div>
  );
}
