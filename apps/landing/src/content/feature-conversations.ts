// Copy and example data for /features/conversations, drawn from the one example trip.
import { saturdayAfter, sintraIdea } from '@/content/example-trip';

export type Person = 'maya' | 'jonas' | 'priya' | 'sam';
export type PlanRef = 'train' | 'pena' | 'lunch' | 'back' | 'fado';
export type ReactionKind = 'like' | 'love' | 'cheer';

export const people: Record<Person, { name: string; initial: string }> = {
  maya: { name: 'Maya', initial: 'M' },
  jonas: { name: 'Jonas', initial: 'J' },
  priya: { name: 'Priya', initial: 'P' },
  sam: { name: 'Sam', initial: 'S' }
};

export const reactionLabels: Record<ReactionKind, string> = {
  like: 'a thumbs-up',
  love: 'a heart',
  cheer: 'a cheer'
};

const refs: PlanRef[] = ['train', 'pena', 'lunch', 'back', 'fado'];

/** Saturday once Maya's idea is applied, shown beside the chat. */
export const saturday = saturdayAfter.map((stop, index) => ({
  ref: refs[index] ?? 'fado',
  time: stop.time,
  title: stop.title
}));

export type ChatEvent =
  | { kind: 'message'; id: string; who: Person; text: string; ref: PlanRef }
  | { kind: 'reply'; to: string; who: Person; text: string }
  | { kind: 'react'; to: string; who: Person; emoji: ReactionKind };

/** One lap of the chat. After the last event the stream crossfades back to the opening state. */
export const chatEvents: ChatEvent[] = [
  { kind: 'message', id: 'train', who: 'jonas', text: 'Who wants the 09:30 train?', ref: 'train' },
  { kind: 'reply', to: 'train', who: 'priya', text: 'Me. I’ll meet you at Rossio.' },
  { kind: 'react', to: 'train', who: 'sam', emoji: 'like' },
  {
    kind: 'message',
    id: 'pena',
    who: 'maya',
    text: 'Pena Palace is timed. I booked 11:00 for four.',
    ref: 'pena'
  },
  { kind: 'react', to: 'pena', who: 'jonas', emoji: 'cheer' },
  {
    kind: 'message',
    id: 'lunch',
    who: 'sam',
    text: 'Lunch before or after the palace?',
    ref: 'lunch'
  },
  { kind: 'reply', to: 'lunch', who: 'maya', text: 'After. The village at 13:30.' },
  { kind: 'react', to: 'lunch', who: 'priya', emoji: 'like' },
  {
    kind: 'message',
    id: 'back',
    who: 'priya',
    text: 'The train back is 17:30, so there’s time before fado.',
    ref: 'back'
  },
  { kind: 'react', to: 'back', who: 'sam', emoji: 'love' },
  { kind: 'react', to: 'back', who: 'jonas', emoji: 'like' }
];

/** Events rendered on first paint and again after every lap. */
export const startingEvents = 6;

export const conversationsCopy = {
  caption: 'The example trip’s chat the evening before Sintra.',
  hint: 'React to a message, or open and fold its replies.',
  stepWait: 2300
};

export const ideaCopy = {
  title: 'When the chat lands on a change, it becomes an idea',
  lede: 'When the chat lands on a change, someone opens an idea for it. The group approves it there, not in the thread.',
  message: 'What if Saturday is Sintra instead of Belém?',
  action: 'Open an idea',
  back: 'Back to the chat',
  ideaTitle: sintraIdea.title,
  byline: `Idea by ${sintraIdea.author}`,
  proposes: sintraIdea.adds[0],
  replaces: sintraIdea.removes[0]
};

export const conversationsSections = [
  {
    title: 'Chat that belongs to the trip.',
    body: 'Conversations live inside the trip, away from the family chat, the work chat, and everything else.'
  },
  {
    title: 'Reply to the exact message.',
    body: 'Answer a question directly so the thread still makes sense a week later.'
  }
];
