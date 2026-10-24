import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { MAX_POLL_OPTION_LENGTH, MAX_POLL_QUESTION_LENGTH } from '#convex/modules/polls/lengths';

export const POLL_LIMITS = {
  maxOpenDays: 14,
  maxOptions: 10,
  minOptions: 2,
  optionLength: MAX_POLL_OPTION_LENGTH,
  questionLength: MAX_POLL_QUESTION_LENGTH
} as const;

const option = v.object({ id: v.string(), label: v.string() });

/** Who asked. An agent's poll keeps its run so the run's creator can close it. */
const creator = v.union(
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() }),
  v.object({
    agentId: assistantAgentValidator,
    kind: v.literal('agent'),
    name: v.string(),
    runId: v.id('agentRuns')
  })
);

const status = v.union(v.literal('open'), v.literal('closed'));

/** Any-of rule a poll wait resolves on. */
const rule = v.union(
  v.object({ kind: v.literal('allVoted') }),
  v.object({ count: v.number(), kind: v.literal('quorum') }),
  v.object({ kind: v.literal('quorum'), percent: v.number() }),
  v.object({ kind: v.literal('optionVotes'), min: v.number() }),
  v.object({ kind: v.literal('optionVotes'), majority: v.literal(true) }),
  v.object({ kind: v.literal('closed') })
);

const createInput = {
  closesAt: v.optional(v.number()),
  discussionId: v.optional(v.id('discussions')),
  multiSelect: v.boolean(),
  options: v.array(v.string()),
  question: v.string(),
  tripId: v.optional(v.id('trips'))
};

const voter = v.object({ name: v.string(), userId: v.string() });

const view = v.object({
  canClose: v.boolean(),
  /** The creator or a group admin may delete the poll, open or closed. */
  canDelete: v.boolean(),
  canVote: v.boolean(),
  closedAt: v.union(v.number(), v.null()),
  closesAt: v.union(v.number(), v.null()),
  createdAt: v.number(),
  createdBy: v.object({ kind: v.union(v.literal('user'), v.literal('agent')), name: v.string() }),
  discussionId: v.union(v.id('discussions'), v.null()),
  eligibleCount: v.number(),
  id: v.id('polls'),
  multiSelect: v.boolean(),
  myOptionIds: v.array(v.string()),
  question: v.string(),
  status,
  tallies: v.array(v.object({ count: v.number(), id: v.string(), label: v.string() })),
  tripId: v.union(v.id('trips'), v.null()),
  /** When the poll was created or closed; votes do not bump it. */
  updatedAt: v.number(),
  votedCount: v.number(),
  voters: v.array(voter)
});

export const PollValidators = { createInput, creator, option, rule, status, view, voter };

export type PollRule = Infer<typeof rule>;
export type PollView = Infer<typeof view>;
export type PollCreator = Infer<typeof creator>;
export type PollCreateInput = {
  closesAt?: number;
  discussionId?: Infer<typeof createInput.discussionId>;
  multiSelect: boolean;
  options: string[];
  question: string;
  tripId?: Infer<typeof createInput.tripId>;
};

export const pollTables = {
  pollVotes: defineTable({
    name: v.string(),
    optionIds: v.array(v.string()),
    organizationId: v.string(),
    pollId: v.id('polls'),
    updatedAt: v.number(),
    userId: v.string()
  }).index('by_pollId_and_userId', ['pollId', 'userId']),
  polls: defineTable({
    closedAt: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    createdBy: creator,
    discussionId: v.optional(v.id('discussions')),
    multiSelect: v.boolean(),
    options: v.array(option),
    organizationId: v.string(),
    question: v.string(),
    status,
    tripId: v.optional(v.id('trips')),
    updatedAt: v.number()
  })
    .index('by_tripId_and_status', ['tripId', 'status'])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_organizationId_and_tripId_and_status', ['organizationId', 'tripId', 'status'])
    .index('by_discussionId', ['discussionId'])
};
