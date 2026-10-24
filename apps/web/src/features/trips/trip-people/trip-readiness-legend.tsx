import { cn } from '@groam/ui/lib/utils';
import type { RosterCounts } from '@/types/trip-people';
import { FACE_ORDER, FACE_STATES, faceLabel } from './trip-face-states';

/** Under the seat strip: each non-empty state's count and word, with a swatch dressed as its face. */
export function TripReadinessLegend({
  counts,
  takesPayments
}: {
  counts: RosterCounts;
  takesPayments: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-[13px]">
      {FACE_ORDER.filter((status) => counts[status] > 0).map((status) => (
        <li className="flex items-center gap-2" key={status}>
          <span aria-hidden className={cn('inline-flex rounded-full', FACE_STATES[status].ring)}>
            <span
              className={cn('size-3 rounded-full bg-muted-foreground', FACE_STATES[status].fade)}
            />
          </span>
          <span>
            <b className="mr-1 text-[15px] font-semibold text-foreground">{counts[status]}</b>
            {faceLabel(status, takesPayments)}
          </span>
        </li>
      ))}
    </ul>
  );
}
