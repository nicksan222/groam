import { Clock3, TriangleAlert } from '@groam/icons';
import { useId } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripGroupHeader } from './trip-group-header';
import { TripPersonList } from './trip-person-list';
import { TripPersonRow } from './trip-person-row';

/** Blocked: said yes, but the €1 seat isn't paid. Each row says so and offers Cover €1. */
export function TripBlockedGroup({
  actions,
  travelers
}: {
  actions: PeopleActions;
  travelers: TripTraveler[];
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <TripGroupHeader
        count={travelers.length}
        icon={TriangleAlert}
        reason="Said yes, but their €1 seat isn’t paid"
        title="Blocked"
        titleId={titleId}
        tone="warning"
      />
      <TripPersonList warning>
        {travelers.map((traveler) => (
          <TripPersonRow
            actions={actions}
            key={traveler.id}
            status={
              <span className="flex items-center gap-2 text-warning-foreground">
                <Clock3 className="size-3.5" />
                Waiting on their seat
              </span>
            }
            traveler={traveler}
          />
        ))}
      </TripPersonList>
    </section>
  );
}
