import type { Id } from '@groam/backend/data-model';
import type { Icon } from '@groam/icons';
import type { PlanCalendarEvent } from '@groam/ui/lib/plan-calendar';
import type { IssueFlagTarget } from '@/types/issues';
import type {
  Destination,
  PlannedCalendarActivity,
  TimeBlock,
  TransferView,
  TripActivity,
  TripActivityActions,
  TripDetail
} from '@/types/trips';

/** What a plan card shows: each kind keeps its own icon and hue. */
export type PlanKind = 'activity' | 'place' | 'stay' | 'travel';
/** One fact under a card's notes (an address, a cost, a file); a link when it has an `href`. */
export type PlanFactSpec = { key: string; icon: Icon; label: string; href?: string };
/** What every plan source (activity, stay, transfer) can carry besides its title and notes. */
export type PlanFactSource = Pick<TripActivity, 'attachments' | 'costAmount' | 'costSplit'>;
/** Everything a plan card draws, whatever it was made from: a strategy builds it, a view draws it. */
export type PlanCardModel = {
  kind: PlanKind;
  icon: Icon;
  title: string;
  /** The kind's own word, in its hue ("Activity", "Staying overnight"). */
  label: string;
  /** What follows the label, each part after a dot. */
  meta: string[];
  notes: string | null;
  facts: PlanFactSpec[];
};
export type PlannerPeriod = 'full_day' | 'morning' | 'afternoon' | 'evening';
export type PlannerEntry = {
  key: string;
  title: string;
  location: string;
  startDay: number | null;
  endDay: number | null;
  startTime: string | null;
  endTime: string | null;
  period: PlannerPeriod;
  /** What flagging this card raises an issue about. */
  flag: IssueFlagTarget;
} & (
  | { kind: 'activity'; activity: TripActivity }
  | { kind: 'travel'; transfer: TransferView }
  | {
      kind: 'stay';
      event: 'check_in' | 'check_out' | 'overnight';
      stay: Destination['stays'][number];
    }
);
/** How one kind of planner entry becomes a card; add a kind by adding a strategy. */
export type PlanEntryStrategy<Kind extends PlannerEntry['kind']> = (
  entry: Extract<PlannerEntry, { kind: Kind }>,
  currency: string
) => PlanCardModel;
export type PlannerDay = {
  day: number;
  destinations: Destination[];
  entries: PlannerEntry[];
  stays: Array<{ destination: Destination; stay: Destination['stays'][number] }>;
};
export type TripPlanner = {
  days: PlannerDay[];
  /** Every plan once, in build order; days repeat multi-day entries. */
  entries: PlannerEntry[];
  unscheduledDestinations: Destination[];
  unscheduledTravel: PlannerEntry[];
};
export type PlannerTrip = Pick<
  TripDetail,
  'destinations' | 'totalDurationDays' | 'arrivalTransfer' | 'departureTransfer'
>;

/** The shared day card surface; the read-only planner and the idea editor both fill it. */
export type PlannerDayFrameProps = {
  ariaLabel: string;
  children: import('react').ReactNode;
  date: string | null;
  day: number;
  photo?: { name: string; src: string | null };
  subtitle: import('react').ReactNode;
};

/** What the calendar's details panel shows for one plan. */
export type PlannerCalendarDetail =
  | { kind: 'entry'; entry: PlannerEntry }
  | { kind: 'place'; destination: Destination };
/** A trip's plans as calendar events, with the planner data behind each one. */
export type PlannerCalendar = {
  /** Day 1; a placeholder when `undated`. */
  startDate: string;
  endDate: string;
  /** The trip has no start date yet, so the calendar shows trip days only. */
  undated: boolean;
  events: PlanCalendarEvent[];
  details: Record<string, PlannerCalendarDetail>;
};

/** What a traveler picked on the calendar to plan an activity in: trip days and wall-clock times. */
export type CalendarActivityDraft = {
  day: number;
  endDay: number;
  startTime: string | null;
  endTime: string | null;
  timeBlock: TimeBlock;
};

/** The day, and the time when known, that travel without its own timing leaves on. */
export type TravelAnchor = { day: number; time: string | null };

/**
 * How empty time on the calendar plans something: an idea's author adds the activity to the idea
 * (`add`); on the shared trip it starts an idea holding the activity (`propose`).
 */
export type TripCalendarPlanning =
  | {
      mode: 'add';
      addActivity: TripActivityActions['addActivity'];
      /** The idea being edited, which picks up an activity planned for it on the shared trip. */
      proposalId: Id<'tripProposals'>;
    }
  | { mode: 'propose'; startIdea: (activity: PlannedCalendarActivity) => void };
