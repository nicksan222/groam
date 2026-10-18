// Copy and example data for /features/ideas. Plan data comes from the shared example trip.
import { planBefore, saturdayAfter, sintraIdea } from '@/content/example-trip';

export type IdeaState = 'proposed' | 'changes' | 'applied';
export type Approver = 'jonas' | 'priya' | 'sam';

export const stepLabels: Record<IdeaState, string> = {
  proposed: 'Proposed',
  changes: 'Changes requested',
  applied: 'Applied'
};

export const stepCopy: Record<IdeaState, string> = {
  proposed: 'Train to Sintra at 10:30. The live plan still shows Belém.',
  changes: 'Sam asks for an earlier train. Maya moves it to 09:30.',
  applied: 'Saturday is Sintra for everyone.'
};

const adds = sintraIdea.adds;
export const diffLines = [
  ...sintraIdea.removes.map((line) => ({ kind: 'remove' as const, ...line })),
  ...adds.map((line) => ({ kind: 'add' as const, ...line }))
];

/** Index of the train line in `diffLines`; it moves from 10:30 to 09:30 during review. */
export const trainLine = sintraIdea.removes.length;
export const trainTime: Record<IdeaState, string> = {
  proposed: '10:30',
  changes: '09:30',
  applied: '09:30'
};

/** Saturday rows: `old` only in the live plan, `idea` only in the proposal, `both` in each. */
export type PlanRow = { id: string; time: string; label: string; origin: 'old' | 'idea' | 'both' };
const fado = planBefore.sat.at(-1)?.title ?? 'Fado night';
export const planRows: PlanRow[] = [
  ...sintraIdea.removes.map((line, i) => ({
    id: `old-${i}`,
    time: line.time,
    label: line.title,
    origin: 'old' as const
  })),
  ...adds.map((line, i) => ({
    id: `idea-${i}`,
    time: line.time,
    label: line.title,
    origin: 'idea' as const
  })),
  { id: 'fado', time: '21:00', label: fado, origin: 'both' as const }
];

export const livePlan = planBefore.sat;
export const ideaPlan = saturdayAfter;

export const approvalStatus: Record<IdeaState, Record<Approver, { on: boolean; text: string }>> = {
  proposed: {
    jonas: { on: false, text: 'Jonas · waiting' },
    priya: { on: false, text: 'Priya · waiting' },
    sam: { on: false, text: 'Sam · waiting' }
  },
  changes: {
    jonas: { on: true, text: 'Jonas approved' },
    priya: { on: true, text: 'Priya approved' },
    sam: { on: true, text: 'Sam asked for an earlier train' }
  },
  applied: {
    jonas: { on: true, text: 'Jonas approved' },
    priya: { on: true, text: 'Priya approved' },
    sam: { on: true, text: 'Sam approved once the train moved to 09:30' }
  }
};

export const demoStrings = {
  title: sintraIdea.title,
  byline: 'Idea by Maya · Lisbon long weekend',
  agentName: 'Itinerary agent',
  agentNote: sintraIdea.agentNote,
  caption: 'Maya’s Sintra idea on the example trip, from proposed to applied.',
  live: 'Live plan',
  withIdea: 'With this idea',
  livePlan: 'Saturday',
  approve: 'Approve',
  request: 'Request changes',
  reset: 'Replay example',
  stamp: `Applied ${sintraIdea.appliedAt}`
};

export const sections = {
  split: {
    title: 'See exactly what moves.',
    body: 'Look at every added and removed stop before you say yes. No surprises on Saturday morning.',
    hint: 'Drag the divider, or focus it and use the arrow keys.',
    phoneHint: 'Switch between the live plan and the plan with this idea.'
  },
  short: [
    {
      title: 'Ask, revise, try again.',
      body: 'Anyone can request changes. The author revises the same idea, and the conversation about it stays attached.'
    },
    {
      title: 'Apply when it’s agreed.',
      body: 'Applying the idea updates the itinerary for everyone in one step. Until then, the plan people rely on doesn’t budge.'
    }
  ]
} as const;

/** Saturday rows aligned by time for the split: a blank side means nothing sits there. */
export type SplitRow = { time: string; left?: string; right?: string; both?: boolean };
const leftAt = (time: string) => sintraIdea.removes.find((stop) => stop.time === time)?.title;
const rightAt = (time: string) => saturdayAfter.find((stop) => stop.time === time)?.title;
export const splitRows: SplitRow[] = [
  ...new Set([...planBefore.sat, ...saturdayAfter].map((stop) => stop.time))
]
  .sort()
  .map((time) => {
    const left = planBefore.sat.find((stop) => stop.time === time)?.title ?? leftAt(time);
    const right = rightAt(time);
    return { time, left, right, both: left !== undefined && left === right };
  });
