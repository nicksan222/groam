import type { RosterCounts } from '@/types/trip-people';
import type { RosterStatus, TripTraveler } from '@/types/trips';

/** The roster split by status; the viewer leads their own group, the rest keep the server's order. */
export function groupRoster(travelers: TripTraveler[], viewerId: string) {
  const sorted = travelers.toSorted(
    (left, right) => Number(right.userId === viewerId) - Number(left.userId === viewerId)
  );
  return {
    going: sorted.filter((traveler) => traveler.status === 'going'),
    invited: sorted.filter((traveler) => traveler.status === 'invited'),
    maybe: sorted.filter((traveler) => traveler.status === 'maybe'),
    not_going: sorted.filter((traveler) => traveler.status === 'not_going')
  } satisfies Record<RosterStatus, TripTraveler[]>;
}

/** "@maya" whether or not the stored handle already carries the at sign. */
export function handleLabel(handle: string) {
  return handle.startsWith('@') ? handle : `@${handle}`;
}

/** How many people hold each RSVP. */
export function countRoster(travelers: TripTraveler[]): RosterCounts {
  const counts: RosterCounts = { going: 0, invited: 0, maybe: 0, not_going: 0 };
  for (const traveler of travelers) counts[traveler.status] += 1;
  return counts;
}

/** The first word of a name: "Marco Bellini" is "Marco". */
export function firstName(name: string) {
  return name.split(/\s+/u)[0] ?? name;
}

/** "1st", "2nd", "3rd", "19th". */
export function ordinal(value: number) {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th';
  return `${value}${suffix}`;
}
