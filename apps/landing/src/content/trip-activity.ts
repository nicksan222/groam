// Illustrative activity for the example trip shown on the landing page.
import { planBefore, sintraIdea, tripIssues } from '@/content/example-trip';

// Every name, time, and booking here is example content, labelled as such on the page.

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
export type Author = 'maya' | 'jonas' | 'priya' | 'sam' | 'itinerary-agent' | 'issue-agent';

export type ActivityEntry = {
  author: Author;
  verb: string;
  detail?: string;
  time: string;
};

export const authors: Record<Author, { name: string; initial: string; agent: boolean }> = {
  maya: { name: 'Maya', initial: 'M', agent: false },
  jonas: { name: 'Jonas', initial: 'J', agent: false },
  priya: { name: 'Priya', initial: 'P', agent: false },
  sam: { name: 'Sam', initial: 'S', agent: false },
  'itinerary-agent': { name: 'Itinerary agent', initial: 'I', agent: true },
  'issue-agent': { name: 'Issue agent', initial: 'I', agent: true }
};

/** The log plays once in this order, then fades back to the start; the first `visibleEntries` render at rest. */
export const tripActivity: ActivityEntry[] = [
  {
    author: 'maya',
    verb: 'opened an idea',
    detail: sintraIdea.title,
    time: 'Mon 19:12'
  },
  {
    author: 'itinerary-agent',
    verb: 'reviewed the idea',
    detail: sintraIdea.agentNote,
    time: 'Mon 19:13'
  },
  { author: 'jonas', verb: 'approved the idea', time: 'Tue 08:40' },
  {
    author: 'sam',
    verb: 'opened an issue',
    detail: tripIssues[0].title,
    time: 'Tue 09:02'
  },
  {
    author: 'issue-agent',
    verb: 'proposed an idea',
    detail: tripIssues[0].fix,
    time: 'Tue 09:03'
  },
  { author: 'priya', verb: 'approved the idea', time: 'Tue 12:51' },
  {
    author: 'maya',
    verb: 'applied the idea',
    detail: 'Saturday is now Sintra for everyone',
    time: sintraIdea.appliedAt
  },
  {
    author: 'sam',
    verb: 'applied the idea',
    detail: 'Dinner in Alfama is in the plan. The issue closed itself.',
    time: 'Tue 17:30'
  },
  {
    author: 'jonas',
    verb: 'replied in chat',
    detail: 'Who wants the 09:30 train?',
    time: 'Tue 18:02'
  },
  {
    author: 'priya',
    verb: 'opened an issue',
    detail: tripIssues[1].title,
    time: 'Wed 08:20'
  },
  {
    author: 'issue-agent',
    verb: 'proposed an idea',
    detail: tripIssues[1].fix,
    time: 'Wed 08:21'
  },
  {
    author: 'priya',
    verb: 'applied the idea',
    detail: 'Shared taxi from the airport is in the plan. The issue closed itself.',
    time: 'Wed 10:30'
  },
  {
    author: 'itinerary-agent',
    verb: 'reviewed the Sunday plan',
    detail: `${planBefore.sun[3].title} at ${planBefore.sun[3].time} leaves time for the ${planBefore.sun[2].title.toLowerCase()}.`,
    time: 'Wed 11:15'
  },
  {
    author: 'sam',
    verb: 'replied in chat',
    detail: `${planBefore.sun[1].title} at ${planBefore.sun[1].time} works for me.`,
    time: 'Wed 12:40'
  },
  {
    author: 'jonas',
    verb: 'replied in chat',
    detail: 'Friday dinner in Alfama is in the plan for 20:30.',
    time: 'Wed 14:05'
  },
  {
    author: 'maya',
    verb: 'replied in chat',
    detail: 'Saturday is Sintra, Sunday is slow. Good plan.',
    time: 'Wed 16:20'
  },
  {
    author: 'itinerary-agent',
    verb: 'checked Saturday',
    detail: sintraIdea.clashCheck,
    time: 'Thu 09:10'
  },
  {
    author: 'priya',
    verb: 'replied in chat',
    detail: `${planBefore.sun[0].title} at ${planBefore.sun[0].time}, then ${lowerFirst(planBefore.sun[1].title)}.`,
    time: 'Thu 10:25'
  },
  {
    author: 'sam',
    verb: 'replied in chat',
    detail: 'Shared taxi from the airport sounds good.',
    time: 'Thu 12:05'
  }
];

export const visibleEntries = 5;
