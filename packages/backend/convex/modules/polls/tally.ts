import type { PollRule } from '#convex/modules/polls/schema';

export type PollVoter = { name: string; userId: string };
export type PollTally = {
  eligibleCount: number;
  tallies: Array<{ count: number; id: string; label: string }>;
  voted: PollVoter[];
  votedCount: number;
};

/** Counts only current eligible voters; group sizes are tens, so this runs on every read. */
export function tallyPoll(
  options: ReadonlyArray<{ id: string; label: string }>,
  votes: ReadonlyArray<{ optionIds: readonly string[]; userId: string }>,
  eligible: readonly PollVoter[]
): PollTally {
  const byId = new Map(eligible.map((voter) => [voter.userId, voter]));
  const counted = votes.filter((vote) => byId.has(vote.userId) && vote.optionIds.length > 0);
  return {
    eligibleCount: eligible.length,
    tallies: options.map((option) => ({
      count: counted.filter((vote) => vote.optionIds.includes(option.id)).length,
      id: option.id,
      label: option.label
    })),
    voted: counted
      .map((vote) => byId.get(vote.userId))
      .filter((voter): voter is PollVoter => voter !== undefined),
    votedCount: counted.length
  };
}

export function ruleMet(rule: PollRule, tally: PollTally, closed: boolean): boolean {
  const top = Math.max(0, ...tally.tallies.map((entry) => entry.count));
  switch (rule.kind) {
    case 'allVoted':
      return tally.eligibleCount > 0 && tally.votedCount >= tally.eligibleCount;
    case 'quorum':
      return 'count' in rule
        ? tally.votedCount >= rule.count
        : tally.eligibleCount > 0 && tally.votedCount * 100 >= rule.percent * tally.eligibleCount;
    case 'optionVotes':
      return 'min' in rule
        ? top >= rule.min
        : tally.eligibleCount > 0 && top * 2 > tally.eligibleCount;
    case 'closed':
      return closed;
  }
}

export function ruleLabel(rule: PollRule): string {
  switch (rule.kind) {
    case 'allVoted':
      return 'everyone voted';
    case 'quorum':
      return 'count' in rule ? `${rule.count} votes` : `${rule.percent}% voted`;
    case 'optionVotes':
      return 'min' in rule ? `an option reached ${rule.min} votes` : 'majority';
    case 'closed':
      return 'poll closed';
  }
}

export function pollProgress(tally: PollTally): string {
  return `${tally.votedCount} of ${tally.eligibleCount} voted`;
}

export function pollSummary(question: string, tally: PollTally, label: string): string {
  const counts = [...tally.tallies]
    .sort((left, right) => right.count - left.count)
    .map((entry) => `${entry.label} ${entry.count}`)
    .join(', ');
  return `${label} for '${question}' — ${counts}; ${pollProgress(tally)}`;
}
