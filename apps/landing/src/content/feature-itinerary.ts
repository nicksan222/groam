// Copy and example data for /features/itinerary. Plan data comes from the shared example trip.
import { exampleTrip, planBefore, saturdayAfter, type PlanStop } from '@/content/example-trip';

export type Slot = PlanStop & { note?: string };
export type DayPanel = {
  id: string;
  day: 'fri' | 'sat' | 'sun';
  variant?: 'before' | 'after';
  slots: Slot[];
};

export const days = [
  { id: 'fri', label: 'Day 1', name: 'Friday' },
  { id: 'sat', label: 'Day 2', name: 'Saturday' },
  { id: 'sun', label: 'Day 3', name: 'Sunday' }
] as const;

const notes: Record<string, string> = {
  'Land in Lisbon': 'Shared taxi into town, booked in the notes',
  'Check in, Alfama': 'Key box code is in the notes',
  'Dinner in Alfama': 'Table for four, under Maya',
  'Train to Sintra from Rossio': 'Tickets are in the chat',
  'Walk along the river': 'Route is in the notes'
};
const withNotes = (stops: PlanStop[]): Slot[] =>
  stops.map((stop) => {
    const note = notes[stop.title];
    return note ? { ...stop, note } : stop;
  });

export const panels: DayPanel[] = [
  { id: 'fri', day: 'fri', slots: withNotes(planBefore.fri) },
  { id: 'sat-before', day: 'sat', variant: 'before', slots: withNotes(planBefore.sat) },
  { id: 'sat-after', day: 'sat', variant: 'after', slots: withNotes(saturdayAfter) },
  { id: 'sun', day: 'sun', slots: withNotes(planBefore.sun) }
];

/** The whole trip as one continuous run, Saturday as it stands after the idea. */
export const timeline = [
  { name: 'Friday', stops: withNotes(planBefore.fri) },
  { name: 'Saturday', stops: withNotes(saturdayAfter) },
  { name: 'Sunday', stops: withNotes(planBefore.sun) }
];

export const demoStrings = {
  tripName: exampleTrip.name,
  tripMeta: `${exampleTrip.dates} · ${exampleTrip.travelers.length} travelers`,
  beforeAfterLabel: 'Saturday version',
  caption:
    'The example trip, day by day, as every traveler sees it. Same trip, same screen, for all four travelers.',
  before: 'Before',
  after: 'After',
  cursorLabel: 'Time of day',
  reorderHint:
    'Move an activity with its arrow buttons. The times stay put and the activities slide into them.'
};

export const sections = {
  timeline: {
    title: 'Day by day, with the details.',
    body: 'Add destinations, dates, and activities, then leave notes where they matter. The train time sits next to the train.'
  },
  short: [
    {
      title: 'One copy of the plan.',
      body: 'There is no "latest version" to hunt for. Every traveler opens the same itinerary and sees the same Saturday.'
    },
    {
      title: 'Changes arrive through ideas.',
      body: 'Bigger changes can go through an idea first, so the group sees them before they land.'
    }
  ]
} as const;
