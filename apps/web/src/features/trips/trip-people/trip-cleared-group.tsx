import { Check } from '@groam/icons';
import { useId } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripClearedCell } from './trip-cleared-cell';
import { TripGroupHeader } from './trip-group-header';

/**
 * Cleared: going, seat held. A dense grid in one bordered box, two columns and three from the
 * wide container, ruled by hairlines. Fillers close the last row so no cell is left unruled.
 */
export function TripClearedGroup({
  actions,
  travelers
}: {
  actions: PeopleActions;
  travelers: TripTraveler[];
}) {
  const titleId = useId();
  const takesPayments = actions.seats !== null;
  const twoUp = travelers.length % 2;
  const threeUp = (3 - (travelers.length % 3)) % 3;
  return (
    <section aria-labelledby={titleId}>
      <TripGroupHeader
        count={travelers.length}
        icon={Check}
        reason={takesPayments ? 'Going, seat held' : undefined}
        title={takesPayments ? 'Cleared' : 'Going'}
        titleId={titleId}
        tone="success"
      />
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border @3xl/people:grid-cols-3">
        {travelers.map((traveler) => (
          <TripClearedCell actions={actions} key={traveler.id} traveler={traveler} />
        ))}
        {twoUp > 0 ? <li aria-hidden className="bg-background @3xl/people:hidden" /> : null}
        {threeUp > 0 ? (
          <li
            aria-hidden
            className={`hidden bg-background @3xl/people:block ${threeUp === 2 ? '@3xl/people:col-span-2' : ''}`}
          />
        ) : null}
      </ul>
    </section>
  );
}
