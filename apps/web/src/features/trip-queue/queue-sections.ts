import type { QueueKind, QueueSection } from '@/types/queue';

/** The section that lists a kind. */
export const queueKindSection = {
  idea: 'ideas',
  issue: 'issues',
  poll: 'polls'
} as const satisfies Record<QueueKind, QueueSection>;

/** What a queue is called, and what an empty one offers to start. */
export const queueCopy = {
  idea: { create: 'New idea', plural: 'ideas' },
  issue: { create: 'New issue', plural: 'issues' },
  poll: { create: 'New poll', plural: 'polls' }
} as const satisfies Record<QueueKind, { create: string; plural: string }>;
