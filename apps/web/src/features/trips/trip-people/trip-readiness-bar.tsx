import { cn } from '@groam/ui/lib/utils';
import type { RosterCounts } from '@/types/trip-people';
import { FACE_ORDER, faceLabel } from './trip-face-states';

const BARS = {
  going: 'bg-success',
  invited: 'bg-warning',
  maybe: 'bg-transparent ring-[1.5px] ring-inset ring-input',
  not_going: 'bg-muted'
} as const;

/** One bar of 10px segments sized by headcount, each with its count and word: the readiness of a group too big for faces. */
export function TripReadinessBar({
  counts,
  takesPayments
}: {
  counts: RosterCounts;
  takesPayments: boolean;
}) {
  return (
    <ul className="flex gap-1">
      {FACE_ORDER.filter((status) => counts[status] > 0).map((status) => (
        <li
          className="flex min-w-14 basis-0 flex-col gap-2"
          key={status}
          style={{ flexGrow: counts[status] }}
        >
          <span aria-hidden className={cn('h-2.5 rounded-sm', BARS[status])} />
          <span className="text-xs whitespace-nowrap text-muted-foreground sm:text-[13px]">
            <b className="block text-[13px] font-semibold text-foreground sm:mr-1 sm:inline sm:text-[15px]">
              {counts[status]}
            </b>{' '}
            {faceLabel(status, takesPayments)}
          </span>
        </li>
      ))}
    </ul>
  );
}
