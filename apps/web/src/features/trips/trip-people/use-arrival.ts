import { useCallback, useEffect, useState } from 'react';
import type { AssignableStatus, TripTraveler } from '@/types/trips';
import { faceName } from './trip-face-states';
import { firstName } from './trip-roster-groups';

/** How long a moved person's row keeps its landing highlight (the keyframe runs about 1.2s). */
const HIGHLIGHT_MS = 1300;
/** An arrival that never shows up in the roster (the change did not land) stops waiting. */
const GIVE_UP_MS = 5000;

/**
 * Follows a person whose RSVP changed from their card to their new place in the manifest. Once the
 * roster shows them there it opens the Not going list if they went into it folded, focuses their
 * button (the group's Show button if the row is somehow absent), scrolls them into view, flashes
 * their row (`data-arrived`, a CSS keyframe that is off under reduced motion) and sets the polite
 * announcement ("Marco moved to Cleared"). The card itself unmounts as the person leaves its group,
 * so this lives above the groups.
 */
export function useArrival({
  expandOut,
  outExpanded,
  takesPayments,
  travelers
}: {
  /** Opens or folds the Not going list. */
  expandOut: (expanded: boolean) => void;
  outExpanded: boolean;
  takesPayments: boolean;
  travelers: TripTraveler[];
}) {
  const [arrival, setArrival] = useState<{ status: AssignableStatus; userId: string } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const arrive = useCallback(
    (userId: string, status: AssignableStatus) => setArrival({ status, userId }),
    []
  );

  useEffect(() => {
    if (!arrival) return;
    const timer = setTimeout(() => setArrival(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [arrival]);

  useEffect(() => {
    if (!arrival) return;
    const person = travelers.find((traveler) => traveler.userId === arrival.userId);
    if (person?.status !== arrival.status) return;
    if (arrival.status === 'not_going' && !outExpanded) {
      expandOut(true);
      return;
    }
    // A frame later: a card's trigger remounts once as its popover anchor registers, which would
    // drop focus set in the same commit that mounted it.
    requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-traveler="${CSS.escape(arrival.userId)}"]`
      );
      const trigger = row?.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
      if (row && trigger) {
        trigger.focus();
        row.scrollIntoView({ block: 'nearest' });
        row.dataset.arrived = '';
        setTimeout(() => row.removeAttribute('data-arrived'), HIGHLIGHT_MS);
      } else {
        document.querySelector<HTMLElement>(`[data-people-toggle="${arrival.status}"]`)?.focus();
      }
    });
    setAnnouncement(`${firstName(person.name)} moved to ${faceName(person.status, takesPayments)}`);
    // oxlint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- The move is done once the roster shows it; clear the pending arrival after moving DOM focus to the person's new place.
    setArrival(null);
  }, [arrival, expandOut, outExpanded, takesPayments, travelers]);

  return { announcement, arrive };
}
