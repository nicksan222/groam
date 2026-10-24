import type { Poll } from '@/types/polls';

/** Where a poll stands, in a phrase: "Sushi leads 4–2", "Tied at 3", or "No votes yet". */
export function pollLeader(poll: Poll) {
  const ranked = poll.tallies.toSorted((left, right) => right.count - left.count);
  const [first, second] = ranked;
  if (!first || first.count === 0) return 'No votes yet';
  const runnerUp = second?.count ?? 0;
  if (runnerUp === first.count) return `Tied at ${first.count}`;
  return `${first.label} ${poll.status === 'closed' ? 'won' : 'leads'} ${first.count}–${runnerUp}`;
}
