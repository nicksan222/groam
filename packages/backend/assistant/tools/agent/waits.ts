import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

const HOUR_MS = 60 * 60 * 1000;

/** Any-of poll rules; mirrors `PollValidators.rule`. */
export const pollRuleInputSchema = z.union([
  z.object({ kind: z.literal('allVoted') }).describe('Every eligible voter voted.'),
  z
    .object({ count: z.number().int().min(1), kind: z.literal('quorum') })
    .describe('At least this many people voted.'),
  z
    .object({ kind: z.literal('quorum'), percent: z.number().min(1).max(100) })
    .describe('At least this percent of eligible voters voted.'),
  z
    .object({ kind: z.literal('optionVotes'), min: z.number().int().min(1) })
    .describe('Some option reached this many votes.'),
  z
    .object({ kind: z.literal('optionVotes'), majority: z.literal(true) })
    .describe('Some option has votes from more than half of eligible voters.'),
  z.object({ kind: z.literal('closed') }).describe('The poll was closed.')
]);

/** One variant per wait kind. */
export const waitConditionInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('timer') }).describe('Resume when the deadline passes.'),
  z
    .object({
      kind: z.literal('poll'),
      pollId: z.string().describe('A poll id returned by createPoll. Never invent one.'),
      rule: z.array(pollRuleInputSchema).min(1)
    })
    .describe('Resume when any listed rule holds for an existing poll.'),
  z
    .object({
      issueId: z.string().describe('A trip issue id you were given or listed. Never invent one.'),
      kind: z.literal('issue')
    })
    .describe('Resume when the trip issue is closed or marked won’t do.'),
  z
    .object({
      kind: z.literal('proposal'),
      proposalId: z.string().describe('An idea id you were given or listed. Never invent one.'),
      until: z.enum(['approved', 'decided'])
    })
    .describe(
      'Resume when the idea has its required approvals (approved) or is applied or passed on (decided).'
    ),
  z
    .object({
      kind: z.literal('rsvp'),
      rule: z.object({ going: z.number().int().min(1) })
    })
    .describe(
      'Resume when at least this many travelers are going on the active trip. Members who have not RSVPed count as going.'
    )
]);

type WaitConditionInput = z.infer<typeof waitConditionInputSchema>;

function toCondition(input: WaitConditionInput, activeTripId: Id<'trips'> | null) {
  switch (input.kind) {
    case 'timer': {
      return { kind: 'timer' as const };
    }
    case 'poll': {
      return { kind: 'poll' as const, pollId: input.pollId as Id<'polls'>, rule: input.rule };
    }
    case 'issue': {
      return {
        issueId: input.issueId as Id<'tripIssues'>,
        kind: 'issue' as const,
        until: 'resolved' as const
      };
    }
    case 'proposal': {
      return {
        kind: 'proposal' as const,
        proposalId: input.proposalId as Id<'tripProposals'>,
        until: input.until
      };
    }
    case 'rsvp': {
      if (!activeTripId) throw new ConvexError('Open a trip before waiting on RSVPs');
      return { kind: 'rsvp' as const, rule: input.rule, tripId: activeTripId };
    }
  }
}

export const deadlineHoursField = z
  .number()
  .min(0.05)
  .max(336)
  .describe(
    'Hours from now until the deadline (max 336 = 14 days). The run resumes then even if the condition is not met.'
  );

/** Suspends the calling run; `wait: true` is what `stopAfterWait` ends the generation on. */
export function createWaitForTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Suspend this run until a condition is met or the deadline passes. Stop after calling it; the run resumes in this same conversation with the outcome.',
    execute: async (toolCtx, input) => {
      const created = await toolCtx.runMutation(
        internal.modules.assistant.waits.functions.createForRun,
        {
          condition: toCondition(input.condition, activeTripId),
          deadlineAt: Date.now() + input.deadlineHours * HOUR_MS
        }
      );
      return { status: created.status, wait: true as const, waitId: created.waitId };
    },
    inputSchema: z.object({
      condition: waitConditionInputSchema,
      deadlineHours: deadlineHoursField
    })
  });
}

export function createCancelWaitTool() {
  return createTool({
    description: 'Cancel a pending wait of this run or of another run in this chat.',
    execute: async (toolCtx, input) => {
      await toolCtx.runMutation(internal.modules.assistant.waits.functions.cancelForRun, {
        waitId: input.waitId as Id<'agentWaits'>
      });
      return { cancelled: true as const, waitId: input.waitId };
    },
    inputSchema: z.object({
      waitId: z
        .string()
        .describe(
          'The wait id exactly as listed under "Pending waits" in your instructions, or the waitId waitFor returned in this run. Never invent one.'
        )
    })
  });
}
