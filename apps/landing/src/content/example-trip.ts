// The one example trip every demo on the site draws from, so the plan never contradicts itself
// from page to page. All of it is illustrative and labelled "Example trip" wherever it appears.

export const exampleTrip = {
  name: 'Lisbon long weekend',
  dates: 'Fri 14 to Sun 16 Nov',
  organizer: 'Maya',
  travelers: ['Maya', 'Jonas', 'Priya', 'Sam']
} as const;

export type PlanStop = { time: string; title: string };

/** The agreed plan before Maya's idea is applied. */
export const planBefore: Record<'fri' | 'sat' | 'sun', PlanStop[]> = {
  fri: [
    { time: '14:20', title: 'Land in Lisbon' },
    { time: '15:30', title: 'Check in, Alfama' },
    { time: '20:30', title: 'Dinner in Alfama' }
  ],
  sat: [
    { time: '10:00', title: 'Belém walking tour' },
    { time: '13:30', title: 'Lunch in Belém' },
    { time: '21:00', title: 'Fado night' }
  ],
  sun: [
    { time: '09:30', title: 'Pack and check out' },
    { time: '11:00', title: 'Brunch at LX Factory' },
    { time: '14:00', title: 'Walk along the river' },
    { time: '16:30', title: 'Taxi to the airport' },
    { time: '18:40', title: 'Fly home' }
  ]
};

const sintraIdeaTitle = 'Swap Belém for Sintra';

/** Maya's idea: swap Belém for Sintra on Saturday. */
export const sintraIdea = {
  title: sintraIdeaTitle,
  author: 'Maya',
  removes: [
    { time: '10:00', title: 'Belém walking tour' },
    { time: '13:30', title: 'Lunch in Belém' }
  ],
  adds: [
    { time: '09:30', title: 'Train to Sintra from Rossio' },
    { time: '11:00', title: 'Pena Palace, timed entry' },
    { time: '13:30', title: 'Lunch in Sintra village' },
    { time: '17:30', title: 'Train back to Lisbon' }
  ],
  agentNote: 'Pena Palace at 11:00 leaves time for lunch in the village.',
  /** The agent's answer when asked whether the idea clashes with anything. */
  clashCheck: 'No clash. It replaces the Belém tour and lunch, and fado at 21:00 is untouched.',
  appliedAt: 'Tue 13:05'
} as const;

/** Saturday once the idea is applied. */
export const saturdayAfter: PlanStop[] = [
  { time: '09:30', title: 'Train to Sintra from Rossio' },
  { time: '11:00', title: 'Pena Palace, timed entry' },
  { time: '13:30', title: 'Lunch in Sintra village' },
  { time: '17:30', title: 'Train back to Lisbon' },
  { time: '21:00', title: 'Fado night' }
];

/** Loose ends on the trip; each closes when the idea linked to it is applied. */
export const tripIssues = [
  { title: 'Book Friday dinner for 4', fix: 'Dinner in Alfama, Fri 20:30' },
  {
    title: 'Nobody has sorted the airport transfer',
    fix: 'Shared taxi from the airport, Fri 14:45'
  },
  { title: 'Buy train tickets for Saturday', fix: sintraIdeaTitle }
] as const;
