import type { QueueIssue, QueueItem } from '@/types/queue';

/** How many of the viewer's open items Plan names before pointing on to the queues. */
export const yourTurnLimit = 3;

/** The open items that wait on the viewer, in the queue's order. */
export function yourTurnItems(items: readonly QueueItem[]): QueueItem[] {
  return items.filter((item) => item.yourTurn && !item.settled);
}

/** How many of the viewer's items the strip leaves out, by the section that lists them. */
export function leftOutByKind(
  items: readonly QueueItem[],
  limit = yourTurnLimit
): Record<'ideas' | 'issues' | 'polls', number> {
  const rest = items.slice(limit);
  return {
    ideas: rest.filter((item) => item.kind === 'idea').length,
    issues: rest.filter((item) => item.kind === 'issue').length,
    polls: rest.filter((item) => item.kind === 'poll').length
  };
}

/** How many of the issues every trip needs settled are done; null when the trip has none. */
export function mandatoryProgress(
  issues: readonly Pick<QueueIssue, 'labels' | 'status'>[] | undefined
): { done: number; total: number } | null {
  const mandatory = issues?.filter((issue) => issue.labels.includes('mandatory')) ?? [];
  if (mandatory.length === 0) return null;
  return {
    done: mandatory.filter((issue) => issue.status === 'closed').length,
    total: mandatory.length
  };
}
