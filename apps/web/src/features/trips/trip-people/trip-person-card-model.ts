import type { ChoiceModel, PeopleActions, SeatActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { firstName, ordinal } from './trip-roster-groups';
import { canGo, offersSeat } from './trip-seat-rules';

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function goingSeatLine(traveler: TripTraveler, seats: SeatActions | null) {
  if (seats === null) return 'Going';
  return seats.isFree(traveler.userId) ? 'Cleared · free seat' : 'Cleared · seat paid';
}

function goingModel(
  traveler: TripTraveler,
  actions: PeopleActions,
  isYou: boolean,
  offer: boolean
): ChoiceModel {
  const { goingCount, seats } = actions;
  if (traveler.status === 'invited') {
    return {
      consequence: 'Said yes · waiting on a €1 seat',
      id: 'going',
      kind: 'held',
      seat: offer
    };
  }
  if (traveler.status === 'going') {
    return {
      consequence: goingSeatLine(traveler, seats),
      id: 'going',
      kind: 'checked',
      seat: false
    };
  }
  if (!canGo(traveler, seats)) {
    return {
      consequence: offer
        ? `Opens once ${isYou ? 'your' : 'their'} €1 seat is paid`
        : 'Needs a seat — an organizer can cover it.',
      id: 'going',
      kind: 'blocked',
      seat: offer
    };
  }
  return {
    consequence: `Becomes the ${ordinal(goingCount + 1)} ${seats === null ? 'going' : 'cleared'}`,
    id: 'going',
    kind: 'open',
    seat: false
  };
}

function maybeModel(checked: boolean, maybeCount: number): ChoiceModel {
  if (!checked) {
    return {
      consequence: `Moves to Deciding (${maybeCount + 1})`,
      id: 'maybe',
      kind: 'open',
      seat: false
    };
  }
  const others = maybeCount - 1;
  return {
    consequence: others > 0 ? `Deciding with ${plural(others, 'other')}` : 'Deciding',
    id: 'maybe',
    kind: 'checked',
    seat: false
  };
}

function outModel(checked: boolean, outCount: number): ChoiceModel {
  if (!checked) {
    return {
      consequence: 'Off this trip, still in the group',
      id: 'not_going',
      kind: 'open',
      seat: false
    };
  }
  const others = outCount - 1;
  return {
    consequence: others > 0 ? `Out with ${plural(others, 'other')}` : 'Out of this trip',
    id: 'not_going',
    kind: 'checked',
    seat: false
  };
}

/** The three RSVP rows for this person, each with its state and the line saying what it means. */
export function choiceModels(
  traveler: TripTraveler,
  actions: PeopleActions,
  isYou: boolean
): ChoiceModel[] {
  const { counts, seats, viewerId } = actions;
  const offer = offersSeat(traveler, seats, { inCard: true, viewerId });
  return [
    goingModel(traveler, actions, isYou, offer),
    maybeModel(traveler.status === 'maybe', counts.maybe),
    outModel(traveler.status === 'not_going', counts.not_going)
  ];
}

/** The one muted line for a card with no choices (the viewer may not change this answer). */
export function readOnlyLine(traveler: TripTraveler) {
  return `Only organizers can change ${firstName(traveler.name)}’s answer.`;
}
