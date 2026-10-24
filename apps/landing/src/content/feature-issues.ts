// Copy and example data for /features/issues, drawn from the one example trip.
import { planBefore, tripIssues } from '@/content/example-trip';

export type ExampleIssue = { title: string; idea: string };

const brunch = planBefore.sun[0];

/** Index 0 to 2 are the trip's own issues; the last one is already closed when the demo opens. */
export const issues: ExampleIssue[] = [
  ...tripIssues.map((issue) => ({ title: issue.title, idea: issue.fix })),
  {
    title: 'Nobody has picked Sunday brunch',
    idea: `${brunch?.title ?? 'Brunch'}, Sun ${brunch?.time ?? '11:00'}`
  }
];

export const issueAt = (index: number): ExampleIssue => issues[index] ?? { title: '', idea: '' };

export type LoopStep = {
  op: 'link' | 'check' | 'move' | 'arrive' | 'fade' | 'reset';
  id?: number;
  wait: number;
};

/** What the board shows when it opens, and again after every lap. */
export const start = { open: [0, 1], closed: [3], linked: [0] };

/** Membership lookups for `start`, so loops over issues don't scan its arrays. */
export const startSets = {
  open: new Set(start.open),
  closed: new Set(start.closed),
  linked: new Set(start.linked)
};

/** One lap of the board; the final steps crossfade back to `start`. */
export const lap: LoopStep[] = [
  { op: 'link', id: 1, wait: 1900 },
  { op: 'check', id: 0, wait: 800 },
  { op: 'move', id: 0, wait: 1900 },
  { op: 'arrive', id: 2, wait: 1900 },
  { op: 'check', id: 1, wait: 800 },
  { op: 'move', id: 1, wait: 1900 },
  { op: 'link', id: 2, wait: 1900 },
  { op: 'check', id: 2, wait: 800 },
  { op: 'move', id: 2, wait: 2600 },
  { op: 'fade', wait: 240 },
  { op: 'reset', wait: 1400 }
];

export const issuesCopy = {
  caption: 'Loose ends arrive, get an idea, and close when the idea is applied.',
  idle: 'Open: Book Friday dinner for 4.',
  linked: (idea: string) => `Idea linked. ${idea}.`,
  closed: 'The idea was applied, so the issue closed itself.',
  opened: (title: string) => `Open: ${title}.`,
  emptyOpen: 'Nothing open. Every loose end is closed.',
  emptyClosed: 'Nothing closed yet.'
};

export const flowCopy = {
  title: 'Apply an idea, close an issue',
  lede: 'Each open issue has an idea linked to it. Apply one and its issue moves to Closed.',
  apply: 'Apply the idea',
  reset: 'Replay example'
};

export const issuesSections = [
  {
    title: 'Put it where the group sees it.',
    body: '“Nobody has booked Friday dinner” stops being a message that scrolls away. It becomes an issue on the trip.'
  },
  {
    title: 'Let an agent take a first pass.',
    body: 'An issue agent can work on a loose end with you. Its idea goes to the group for review, like anyone else’s.'
  }
];
