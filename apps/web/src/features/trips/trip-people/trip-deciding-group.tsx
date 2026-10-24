import { Check, CircleDashed } from '@groam/icons';
import { useId } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripGroupHeader } from './trip-group-header';
import { TripPersonList } from './trip-person-list';
import { TripPersonRow } from './trip-person-row';

/** Deciding: answered maybe. On payments trips each row says whether their seat is already paid;
 * nobody is asked to cover a maybe's seat. */
export function TripDecidingGroup({
  actions,
  travelers
}: {
  actions: PeopleActions;
  travelers: TripTraveler[];
}) {
  const titleId = useId();
  const { seats } = actions;
  return (
    <section aria-labelledby={titleId}>
      <TripGroupHeader
        count={travelers.length}
        icon={CircleDashed}
        reason="Answered maybe"
        title="Deciding"
        titleId={titleId}
        tone="muted"
      />
      <TripPersonList>
        {travelers.map((traveler) => (
          <TripPersonRow
            actions={actions}
            key={traveler.id}
            status={
              seats === null ? undefined : seats.hasSeat(traveler.userId) ? (
                <span className="flex items-center gap-2 text-success-foreground">
                  <Check className="size-3.5" />
                  Seat already paid
                </span>
              ) : (
                'No seat yet'
              )
            }
            traveler={traveler}
          />
        ))}
      </TripPersonList>
    </section>
  );
}
