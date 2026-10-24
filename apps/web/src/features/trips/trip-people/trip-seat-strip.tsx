import { Tooltip, TooltipContent, TooltipTrigger } from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import { useEffect, useState } from 'react';
import type { RosterCounts } from '@/types/trip-people';
import type { RosterStatus, TripTraveler } from '@/types/trips';
import { FACE_ORDER, FACE_STATES, faceLabel, faceName } from './trip-face-states';
import { TripPersonAvatar } from './trip-person-avatar';

/** The faces arrive over about this long in total, however many there are. */
const STAGGER_TOTAL_MS = 360;
const STAGGER_STEP_MS = 24;
/** Past the arrival, a face that changes state plays in with no delay. */
const SETTLE_MS = 700;

function summary(counts: RosterCounts, takesPayments: boolean) {
  const parts = FACE_ORDER.filter((status) => counts[status] > 0).map(
    (status) =>
      `${counts[status]} ${status === 'going' && takesPayments ? 'cleared to go' : faceLabel(status, takesPayments)}`
  );
  return `The group: ${parts.join(', ')}`;
}

/**
 * The group as faces: one 24px avatar per person, cleared first, then blocked, deciding and out
 * (the viewer leading their group), each in its readiness state with a name-and-state tooltip. The
 * strip is one image to assistive technology with the counts as its label; tooltips are mouse
 * sugar. Faces fade and scale in on first mount, and a face that changes state plays in again.
 */
export function TripSeatStrip({
  counts,
  groups,
  takesPayments
}: {
  counts: RosterCounts;
  groups: Record<RosterStatus, TripTraveler[]>;
  takesPayments: boolean;
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);
  const people = FACE_ORDER.flatMap((status) =>
    groups[status].map((traveler) => ({ status, traveler }))
  );
  const step = Math.min(STAGGER_STEP_MS, STAGGER_TOTAL_MS / people.length);
  return (
    <div aria-label={summary(counts, takesPayments)} className="flex flex-wrap gap-1" role="img">
      {people.map(({ status, traveler }, index) => (
        <Tooltip key={`${traveler.userId}:${status}`}>
          <TooltipTrigger asChild>
            <span
              aria-hidden
              className={cn('people-face-in rounded-full', FACE_STATES[status].ring)}
              style={{ animationDelay: settled ? undefined : `${Math.round(index * step)}ms` }}
            >
              <TripPersonAvatar
                className={FACE_STATES[status].fade}
                size="sm"
                traveler={traveler}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {traveler.name} · {faceName(status, takesPayments)}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
