import type { AssignableStatus, RosterStatus, TripTraveler } from './trips';

/** What the People manifest needs to know about seats; absent when the trip takes no payments. */
export type SeatActions = {
  /** Whether the viewer may pay or cover this person's seat. */
  canPay: (traveler: TripTraveler) => boolean;
  disabled: boolean;
  /** Whether this person's seat is paid (or free); a Maybe can already hold one. */
  hasSeat: (userId: string) => boolean;
  /** Whether this person's seat is the free one (the trip creator's). */
  isFree: (userId: string) => boolean;
  onPay: (userId: string) => void;
  pendingUserId: string | null;
};

/** What the viewer may do on the People page, shared by the pass and every group. */
export type PeopleActions = {
  /**
   * Tells the manifest that someone's RSVP just changed from their card, so it can follow them to
   * their new place: expand the group, focus them, highlight their row, announce the move.
   */
  arrive: (userId: string, status: AssignableStatus) => void;
  /** An archived trip is read-only. */
  archived: boolean;
  /** Whether the viewer may change this person's RSVP. */
  canChange: (traveler: TripTraveler) => boolean;
  /** How many people hold each RSVP now. */
  counts: RosterCounts;
  /** How many people are going now. */
  goingCount: number;
  /** Whether the viewer is an organizer of the trip. */
  isOrganizer: boolean;
  /** Resolves true once the RSVP changed; false when it failed (the toast says why, but it can sit behind a phone's sheet, so the person's card says so too). */
  onChange: (status: AssignableStatus, userId: string) => Promise<boolean>;
  seats: SeatActions | null;
  viewerId: string;
};

/** How many people hold each RSVP. */
export type RosterCounts = Record<RosterStatus, number>;

/**
 * How one RSVP row reads in a person's card:
 * - `checked`: their answer.
 * - `held`: Going for someone who said yes but has no seat; checked, waiting, not pickable.
 * - `blocked`: Going for someone with no seat who has not said yes; not pickable.
 * - `open`: a choice they can pick.
 */
export type ChoiceModel = {
  consequence: string;
  id: AssignableStatus;
  kind: 'blocked' | 'checked' | 'held' | 'open';
  /** Pay or Cover sits in the row. */
  seat: boolean;
};
