import type { QueueGroup, QueueItem } from '@/types/queue';

/** The group that starts folded: settled items are history, not work. */
const settledGroupLabel = 'Settled';

/**
 * A group's stable id, which fold state is keyed by: "Waiting on others" and "Open" are the same
 * group under two names, so folding it survives the label changing.
 */
export function groupId(label: string | null) {
  if (label === null) return 'all';
  return label === 'Waiting on others' ? 'open' : label.toLocaleLowerCase();
}

/** The id of the settled group. */
export const settledGroupId = groupId(settledGroupLabel);

/**
 * One list split by whose turn it is: the viewer's items first, then the open rest, then the
 * settled ones. The open rest is just "Open" when none of it is the viewer's turn.
 */
export function groupItems(items: readonly QueueItem[]): QueueGroup[] {
  const open = items.filter((item) => !item.settled);
  const mine = open.filter((item) => item.yourTurn);
  const others = open.filter((item) => !item.yourTurn);
  return [
    { items: mine, label: 'Your turn' },
    { items: others, label: mine.length > 0 ? 'Waiting on others' : 'Open' },
    { items: items.filter((item) => item.settled), label: settledGroupLabel }
  ].filter((group) => group.items.length > 0);
}
