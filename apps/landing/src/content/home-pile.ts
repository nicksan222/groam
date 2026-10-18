// The home hero's pile of day bills: one example week, one printed sheet per day, and each day
// shows a different thing that happens on a shared trip (an issue closing, a chat, a change asked
// for and revised, an agent's research, an agent's edit). Everything here is illustrative and is
// labelled "Example trip" on the page.
import type { Author } from '@/content/trip-activity';

export const weekTrip = { name: 'A week in Portugal', dates: 'Mon 3 to Sun 9 May' } as const;

export type BoardRow =
  | { kind: 'stop'; time: string; title: string }
  | { kind: 'issue'; time: string; title: string }
  | { kind: 'blank' };

/** Stages the strip moves through; `changes` tilts it the other way while the author revises. */
export type Stage = 'plan' | 'proposed' | 'changes' | 'review' | 'applied';

export type BoardEvent = {
  author: Author;
  text: string;
  /** How the line is printed: a chat slip, an agent's research list, or a plain line. */
  kind?: 'comment' | 'research';
  /** Options an agent looked at, printed under a research line. */
  options?: string[];
  stage?: Stage;
  /** Strip rows whose time changes when this line lands: [row index, time before, time after]. */
  revise?: [number, string, string][];
  /** Status line once this event has landed. */
  status?: string;
};

export type DayBoard = {
  id: string;
  day: string;
  date: string;
  /** Where the place is that day, printed small beside the date. */
  place: string;
  rows: BoardRow[];
  strip?: {
    author: Author;
    title: string;
    by: string;
    /** Printed inside the strip: what kind of change it is. */
    kind: 'Idea' | 'Agent edit';
    start: number;
    count: number;
    rows: { time: string; title: string }[];
  };
  events: BoardEvent[];
  /** Status line before any event lands. */
  status: string;
  /** The board's tab before and after its events. */
  tab: { before: string; after: string };
};

export const dayBoards: DayBoard[] = [
  {
    id: 'mon',
    day: 'Mon',
    date: '3 May',
    place: 'Lisbon',
    rows: [
      { kind: 'stop', time: '14:20', title: 'Land in Lisbon' },
      { kind: 'issue', time: '14:45', title: 'Airport transfer not sorted' },
      { kind: 'stop', time: '16:00', title: 'Check in, Alfama' },
      { kind: 'stop', time: '20:30', title: 'Dinner in Alfama' }
    ],
    strip: {
      author: 'issue-agent',
      title: 'Shared taxi',
      by: 'Idea by the issue agent',
      kind: 'Idea',
      start: 1,
      count: 1,
      rows: [{ time: '14:45', title: 'Shared taxi for four' }]
    },
    events: [
      { author: 'priya', text: 'Priya opened an issue', status: 'One loose end on Monday.' },
      {
        author: 'issue-agent',
        text: 'Issue agent proposed a shared taxi for four',
        stage: 'proposed',
        status: 'Proposed. The issue is still open.'
      },
      { author: 'jonas', text: 'Jonas approved', stage: 'review', status: 'In review.' },
      {
        author: 'priya',
        text: 'Priya applied it. The issue closed itself.',
        stage: 'applied',
        status: 'Applied. Transfer sorted, issue closed.'
      }
    ],
    status: 'Monday as planned.',
    tab: { before: '1 issue open', after: 'Issue closed' }
  },
  {
    id: 'tue',
    day: 'Tue',
    date: '4 May',
    place: 'Lisbon',
    rows: [
      { kind: 'stop', time: '10:00', title: 'Tram 28 up to Graça' },
      { kind: 'stop', time: '13:00', title: 'Lunch at the market' },
      { kind: 'stop', time: '16:00', title: 'Free afternoon' },
      { kind: 'stop', time: '21:00', title: 'Fado in Mouraria' }
    ],
    events: [
      {
        author: 'jonas',
        kind: 'comment',
        text: 'Who is up for fado? I can book four seats.',
        status: 'Talking it over.'
      },
      { author: 'sam', kind: 'comment', text: 'Me. Can we eat first?' },
      { author: 'priya', kind: 'comment', text: 'In, if it starts after nine.' },
      {
        author: 'jonas',
        kind: 'comment',
        text: 'Booked for 21:00.',
        status: 'Decided in the trip chat.'
      }
    ],
    status: 'Tuesday as planned.',
    tab: { before: 'Chat', after: '4 replies' }
  },
  {
    id: 'wed',
    day: 'Wed',
    date: '5 May',
    place: 'Sintra',
    rows: [
      { kind: 'stop', time: '10:00', title: 'Belém walking tour' },
      { kind: 'stop', time: '13:30', title: 'Lunch in Belém' },
      { kind: 'blank' },
      { kind: 'blank' },
      { kind: 'stop', time: '21:00', title: 'Dinner in Bairro Alto' }
    ],
    strip: {
      author: 'maya',
      title: 'Swap Belém for Sintra',
      by: 'Idea by Maya',
      kind: 'Idea',
      start: 0,
      count: 4,
      rows: [
        { time: '09:30', title: 'Train to Sintra from Rossio' },
        { time: '11:00', title: 'Pena Palace, timed entry' },
        { time: '13:30', title: 'Lunch in Sintra village' },
        { time: '17:30', title: 'Train back to Lisbon' }
      ]
    },
    events: [
      {
        author: 'maya',
        text: 'Maya opened an idea',
        stage: 'proposed',
        status: 'Proposed. The plan has not changed.'
      },
      {
        author: 'sam',
        text: 'Sam asked for changes: an earlier train?',
        stage: 'changes',
        status: 'Changes requested.'
      },
      {
        author: 'maya',
        text: 'Maya moved the train to 09:30',
        stage: 'review',
        revise: [
          [0, '10:30', '09:30'],
          [1, '12:00', '11:00']
        ],
        status: 'Revised. Back in review.'
      },
      {
        author: 'maya',
        text: 'Everyone approved. Maya applied it.',
        stage: 'applied',
        status: 'Applied. Wednesday is Sintra for everyone.'
      }
    ],
    status: 'Wednesday as planned.',
    tab: { before: 'Idea open', after: 'Sintra applied' }
  },
  {
    id: 'thu',
    day: 'Thu',
    date: '6 May',
    place: 'Comporta',
    rows: [
      { kind: 'stop', time: '09:00', title: 'Drive down to Comporta' },
      { kind: 'issue', time: '13:00', title: 'Pick a beach' },
      { kind: 'stop', time: '19:30', title: 'Dinner by the rice fields' }
    ],
    strip: {
      author: 'research-agent',
      title: 'Praia do Carvalhal',
      by: 'Idea by the research agent',
      kind: 'Idea',
      start: 1,
      count: 1,
      rows: [{ time: '13:00', title: 'Praia do Carvalhal' }]
    },
    events: [
      { author: 'maya', text: 'Maya asked the research agent', status: 'Research under way.' },
      {
        author: 'research-agent',
        kind: 'research',
        text: 'Research agent compared three beaches',
        options: ['Praia do Carvalhal', 'Praia da Comporta', 'Praia do Pego']
      },
      {
        author: 'research-agent',
        text: 'It proposed the quietest one with parking',
        stage: 'proposed',
        status: 'Proposed. Waiting on the group.'
      },
      {
        author: 'priya',
        text: 'Priya approved',
        stage: 'review',
        status: 'In review. One approval so far.'
      }
    ],
    status: 'The beach is still open.',
    tab: { before: 'Agent researching', after: 'Idea in review' }
  },
  {
    id: 'fri',
    day: 'Fri',
    date: '7 May',
    place: 'To Porto',
    rows: [
      { kind: 'stop', time: '09:00', title: 'Leave Comporta' },
      { kind: 'stop', time: '13:30', title: 'Lunch in Coimbra' },
      { kind: 'stop', time: '17:00', title: 'Check in, Porto' },
      { kind: 'stop', time: '20:00', title: 'Francesinha night' }
    ],
    strip: {
      author: 'itinerary-agent',
      title: 'Leave earlier',
      by: 'Edit by the itinerary agent',
      kind: 'Agent edit',
      start: 0,
      count: 1,
      rows: [{ time: '08:15', title: 'Leave early, beat the traffic' }]
    },
    events: [
      {
        author: 'itinerary-agent',
        text: 'Itinerary agent: leaving at 09:00 hits Lisbon traffic',
        stage: 'proposed',
        status: 'Agent edit proposed.'
      },
      { author: 'sam', text: 'Sam approved', stage: 'review', status: 'In review.' },
      {
        author: 'maya',
        text: 'Maya applied it',
        stage: 'applied',
        status: 'Applied. Leaving at 08:15.'
      }
    ],
    status: 'Friday as planned.',
    tab: { before: 'Agent edit', after: 'Applied' }
  },
  {
    id: 'sat',
    day: 'Sat',
    date: '8 May',
    place: 'Porto',
    rows: [
      { kind: 'stop', time: '10:00', title: 'Walk down to Ribeira' },
      { kind: 'stop', time: '13:00', title: 'Lunch on the river' },
      { kind: 'issue', time: '16:00', title: 'Book a port cellar tour for 4' },
      { kind: 'stop', time: '21:00', title: 'Dinner in Foz' }
    ],
    events: [
      { author: 'jonas', text: 'Jonas opened an issue', status: 'One loose end on Saturday.' },
      { author: 'priya', kind: 'comment', text: 'One with a tasting, please.' },
      {
        author: 'issue-agent',
        text: 'Issue agent is looking for a 16:00 slot',
        status: 'Open. An agent is on it.'
      }
    ],
    status: 'Saturday as planned.',
    tab: { before: 'Issue opened', after: '1 issue open' }
  },
  {
    id: 'sun',
    day: 'Sun',
    date: '9 May',
    place: 'Home',
    rows: [
      { kind: 'stop', time: '10:00', title: 'Pack and check out' },
      { kind: 'stop', time: '11:30', title: 'Brunch in Cedofeita' },
      { kind: 'stop', time: '15:30', title: 'Metro to the airport' },
      { kind: 'stop', time: '17:40', title: 'Fly home' }
    ],
    events: [
      { author: 'sam', kind: 'comment', text: 'Anyone else on the 15:30 metro?' },
      { author: 'priya', kind: 'comment', text: 'Me. Save me a seat.' },
      {
        author: 'itinerary-agent',
        text: 'Itinerary agent: the 15:30 metro leaves time for the 17:40 flight',
        status: 'Agreed by everyone. Nothing open.'
      }
    ],
    status: 'Agreed by everyone. Nothing open.',
    tab: { before: 'Agreed', after: 'Agreed' }
  }
];
