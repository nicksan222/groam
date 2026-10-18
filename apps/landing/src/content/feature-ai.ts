// Copy and example data for /features/ai. Plan data comes from the canonical example trip.
import {
  exampleTrip,
  planBefore,
  saturdayAfter,
  sintraIdea,
  tripIssues
} from '@/content/example-trip';

export type ScreenId = 'itinerary' | 'ideas' | 'issues';

export type Qa = { question: string; answer: string; highlight: string[]; proposal?: boolean };

export type Screen = {
  id: ScreenId;
  label: string;
  context: string;
  rows: { id: string; time?: string; label: string; note?: string }[];
  qas: Qa[];
};

const [tour, lunch, fado] = planBefore.sat;
const [, , tickets] = tripIssues;

export const screens: Screen[] = [
  {
    id: 'itinerary',
    label: 'Itinerary',
    context: 'Itinerary \u00b7 Saturday',
    rows: [
      { id: 'tour', time: tour?.time, label: tour?.title ?? '' },
      { id: 'lunch', time: lunch?.time, label: lunch?.title ?? '' },
      { id: 'fado', time: fado?.time, label: fado?.title ?? '' }
    ],
    qas: [
      {
        question: 'Does the Sintra idea clash with anything?',
        answer: sintraIdea.clashCheck,
        highlight: ['tour', 'lunch'],
        proposal: true
      },
      {
        question: 'Does Saturday still work?',
        answer:
          'Nothing overlaps. Lunch at 13:30 is the one fixed point, and Fado night at 21:00 is clear.',
        highlight: ['lunch', 'fado']
      }
    ]
  },
  {
    id: 'ideas',
    label: 'Ideas',
    context: 'Ideas \u00b7 1 open',
    rows: [{ id: 'sintra', label: sintraIdea.title, note: sintraIdea.author }],
    qas: [
      {
        question: 'What would the Sintra idea change?',
        answer: `It removes the Belém tour and lunch, and adds four stops from the ${sintraIdea.adds[0].time} train to the ${sintraIdea.adds[3].time} train back.`,
        highlight: ['sintra']
      }
    ]
  },
  {
    id: 'issues',
    label: 'Issues',
    context: 'Issues \u00b7 3 open',
    rows: tripIssues.map((issue, n) => ({ id: `issue-${n}`, label: issue.title })),
    qas: [
      {
        question: 'What is still open?',
        answer: 'Three issues. Buying the Saturday train tickets depends on the Sintra idea.',
        highlight: ['issue-0', 'issue-1', 'issue-2']
      },
      {
        question: 'Which issue would the Sintra idea close?',
        answer: `${tickets.title}, once the idea is applied.`,
        highlight: ['issue-2']
      }
    ]
  }
];

export const steps = { ask: 'You ask', answer: 'Agent answers' } as const;

export const caption = 'The itinerary agent reviewing Saturday on the example trip.';

export const proposal = {
  label: 'Idea',
  title: sintraIdea.title,
  by: `by ${sintraIdea.author}`
};

export const trip = exampleTrip.name;

export const review = {
  title: 'A second pair of eyes on the plan.',
  body: 'Ask for an itinerary review and get notes on timing and gaps before the group commits.',
  before: { label: 'Saturday now', stops: planBefore.sat },
  after: { label: 'With the idea applied', stops: saturdayAfter },
  note: sintraIdea.agentNote
};

export const sections = [
  {
    title: 'Agents that work on ideas and issues.',
    body: "Specialized agents can draft ideas and work through issues. Their changes go to the group for review, like everyone else's."
  },
  {
    title: 'Runs on your own ChatGPT account.',
    body: "Connect your ChatGPT account in Settings \u2192 AI. Groam doesn't charge anything extra for AI."
  }
] as const;
