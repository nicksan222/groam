import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { PollValidators } from '#convex/modules/polls/schema';

const timerCondition = v.object({ kind: v.literal('timer') });
const pollCondition = v.object({
  kind: v.literal('poll'),
  pollId: v.id('polls'),
  rule: v.array(PollValidators.rule)
});

const issueCondition = v.object({
  issueId: v.id('tripIssues'),
  kind: v.literal('issue'),
  until: v.literal('resolved')
});
const proposalCondition = v.object({
  kind: v.literal('proposal'),
  proposalId: v.id('tripProposals'),
  until: v.union(v.literal('approved'), v.literal('decided'))
});
const rsvpCondition = v.object({
  kind: v.literal('rsvp'),
  /** At least this many current members going (members without an RSVP row count). */
  rule: v.object({ going: v.number() }),
  tripId: v.id('trips')
});

/** One variant per kind. Additive only. */
const condition = v.union(
  timerCondition,
  pollCondition,
  issueCondition,
  proposalCondition,
  rsvpCondition
);
const kind = v.union(
  v.literal('timer'),
  v.literal('poll'),
  v.literal('issue'),
  v.literal('proposal'),
  v.literal('rsvp')
);

const timerSnapshot = v.object({ kind: v.literal('timer') });
const pollSnapshot = v.object({
  closed: v.boolean(),
  eligible: v.number(),
  kind: v.literal('poll'),
  pollId: v.id('polls'),
  question: v.string(),
  tallies: v.array(v.object({ count: v.number(), label: v.string() })),
  voters: v.array(v.string())
});
const issueSnapshot = v.object({
  issueId: v.id('tripIssues'),
  kind: v.literal('issue'),
  status: v.string(),
  title: v.string()
});
const proposalSnapshot = v.object({
  approvals: v.number(),
  kind: v.literal('proposal'),
  proposalId: v.id('tripProposals'),
  required: v.number(),
  status: v.string(),
  title: v.string()
});
const rsvpSnapshot = v.object({
  going: v.number(),
  kind: v.literal('rsvp'),
  maybe: v.number(),
  notGoing: v.number(),
  tripId: v.id('trips')
});
const snapshot = v.union(
  timerSnapshot,
  pollSnapshot,
  issueSnapshot,
  proposalSnapshot,
  rsvpSnapshot
);

const reason = v.union(v.literal('met'), v.literal('deadline'), v.literal('cancelled'));
const status = v.union(
  v.literal('waiting'),
  v.literal('met'),
  v.literal('expired'),
  v.literal('cancelled')
);

const outcome = v.object({
  progress: v.union(v.string(), v.null()),
  reason,
  /** Absent when the run ended and its wait closed without re-reading the watched entity. */
  snapshot: v.optional(snapshot),
  summary: v.string()
});

const view = v.object({
  /** The waiting run's agent, for the banner label and link. */
  agentId: assistantAgentValidator,
  deadlineAt: v.number(),
  id: v.id('agentWaits'),
  kind,
  label: v.string(),
  progress: v.union(v.string(), v.null()),
  runId: v.id('agentRuns'),
  status
});

export const AgentWaitValidators = { condition, kind, outcome, reason, snapshot, status, view };

export type WaitCondition = Infer<typeof condition>;
export type WaitKind = WaitCondition['kind'];
export type WaitOutcome = Infer<typeof outcome>;
export type WaitSnapshot = Infer<typeof snapshot>;
export type WaitStatus = Infer<typeof status>;
export type WaitReason = Infer<typeof reason>;
export type AgentWaitView = Infer<typeof view>;

export const agentWaitTables = {
  agentWaits: defineTable({
    condition,
    deadlineAt: v.number(),
    /** `@convex-dev/workflow` event the suspended run awaits. */
    eventId: v.string(),
    kind,
    organizationId: v.string(),
    outcome: v.optional(outcome),
    /** The watched entity id, denormalized for `signal`. */
    refId: v.string(),
    resolvedAt: v.optional(v.number()),
    runId: v.id('agentRuns'),
    status,
    tripId: v.optional(v.id('trips')),
    workflowId: v.string()
  })
    .index('by_kind_and_refId_and_status', ['kind', 'refId', 'status'])
    /** Whether a group has any pending wait of a kind, before scheduling a re-check. */
    .index('by_organizationId_and_status_and_kind', ['organizationId', 'status', 'kind'])
    .index('by_runId', ['runId'])
};
