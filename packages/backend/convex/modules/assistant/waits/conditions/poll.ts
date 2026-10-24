import { ConvexError } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { defineWaitCondition, memoized } from '#convex/modules/assistant/waits/conditions/types';
import { readablePoll } from '#convex/modules/polls/access';
import { pollTally, voterLoader } from '#convex/modules/polls/eligibility';
import type { PollRule } from '#convex/modules/polls/schema';
import {
  type PollTally,
  pollProgress,
  pollSummary,
  ruleLabel,
  ruleMet
} from '#convex/modules/polls/tally';

function assertRule(rule: PollRule[]): void {
  if (rule.length === 0) throw new ConvexError('Choose at least one poll rule');
  for (const entry of rule) {
    if (
      entry.kind === 'quorum' &&
      'count' in entry &&
      !(Number.isInteger(entry.count) && entry.count >= 1)
    ) {
      throw new ConvexError('A quorum count must be a whole number of at least 1');
    }
    if (
      entry.kind === 'quorum' &&
      'percent' in entry &&
      !(entry.percent >= 1 && entry.percent <= 100)
    ) {
      throw new ConvexError('A quorum percent must be between 1 and 100');
    }
    if (
      entry.kind === 'optionVotes' &&
      'min' in entry &&
      !(Number.isInteger(entry.min) && entry.min >= 1)
    ) {
      throw new ConvexError('An option vote minimum must be a whole number of at least 1');
    }
  }
}

/** Met when any listed rule holds for the poll's current eligible voters. */
export const pollCondition = defineWaitCondition({
  judge: (condition, loaded: { poll: Doc<'polls'>; tally: PollTally } | null) => {
    if (!loaded) {
      return {
        met: false,
        progress: null,
        snapshot: {
          closed: true,
          eligible: 0,
          kind: 'poll',
          pollId: condition.pollId,
          question: 'Deleted poll',
          tallies: [],
          voters: []
        },
        summary: 'The poll was deleted'
      };
    }
    const { poll, tally } = loaded;
    const closed = poll.status === 'closed';
    const metRule = condition.rule.find((rule) => ruleMet(rule, tally, closed));
    const label = ruleLabel(metRule ?? condition.rule[0] ?? { kind: 'allVoted' });
    return {
      met: metRule !== undefined,
      progress: pollProgress(tally),
      snapshot: {
        closed,
        eligible: tally.eligibleCount,
        kind: 'poll',
        pollId: poll._id,
        question: poll.question,
        tallies: tally.tallies.map(({ count, label: optionLabel }) => ({
          count,
          label: optionLabel
        })),
        voters: tally.voted.map((voter) => voter.name)
      },
      summary: pollSummary(poll.question, tally, label)
    };
  },
  kind: 'poll',
  label: async (ctx, condition) => {
    const poll = await ctx.db.get('polls', condition.pollId);
    return poll ? `poll “${poll.question}”` : 'a deleted poll';
  },
  load: async (ctx, condition, memo) => {
    const poll = await ctx.db.get('polls', condition.pollId);
    if (!poll) return null;
    // One roster and trip RSVP read per signal, however many polls it re-checks.
    const voters = memoized(memo, 'poll:voters', () => voterLoader(ctx));
    return { poll, tally: await pollTally(ctx, poll, voters) };
  },
  refId: (condition) => condition.pollId,
  validate: async (ctx, condition, scope) => {
    assertRule(condition.rule);
    // The run acts for its creator, so it may only watch a poll they can read.
    const poll = await readablePoll(ctx, condition.pollId, scope.viewer);
    if (poll.organizationId !== scope.organizationId) throw new ConvexError('Poll not found');
    if (scope.discussionId && poll.discussionId && poll.discussionId !== scope.discussionId) {
      throw new ConvexError('That poll belongs to another chat');
    }
    if (scope.tripId && poll.tripId && poll.tripId !== scope.tripId) {
      throw new ConvexError('That poll belongs to another trip');
    }
    return { tripId: poll.tripId ?? scope.tripId };
  }
});
