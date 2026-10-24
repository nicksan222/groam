import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import {
  agentRunEventKindValidator,
  agentRunKickoffValidator,
  agentRunStatusValidator,
  agentSurfaceValidator,
  assistantAgentValidator,
  assistantScreenValidator
} from '#convex/modules/assistant/validators/index';

export const researchEffortValidator = v.union(
  v.literal('quick'),
  v.literal('standard'),
  v.literal('deep')
);
export const researchTaskValidator = v.object({
  topic: v.string(),
  parentRunId: v.optional(v.id('agentRuns')),
  effort: researchEffortValidator
});
export const researchResultValidator = v.object({
  sources: v.array(v.object({ url: v.string(), title: v.string() })),
  incomplete: v.boolean()
});

const actor = v.object({ name: v.string(), userId: v.string() });

const related = v.object({
  chatTitle: v.union(v.string(), v.null()),
  ideaTitle: v.union(v.string(), v.null()),
  issueTitle: v.union(v.string(), v.null()),
  tripName: v.union(v.string(), v.null())
});

const run = v.object({
  agentId: assistantAgentValidator,
  completedAt: v.union(v.number(), v.null()),
  createdBy: actor,
  discussionId: v.union(v.id('discussions'), v.null()),
  error: v.union(v.string(), v.null()),
  headline: v.union(v.string(), v.null()),
  id: v.id('agentRuns'),
  shortId: v.string(),
  issueId: v.union(v.id('tripIssues'), v.null()),
  kickoff: agentRunKickoffValidator,
  proposalId: v.union(v.id('tripProposals'), v.null()),
  related,
  report: v.union(v.string(), v.null()),
  researchTask: v.optional(researchTaskValidator),
  startedAt: v.union(v.number(), v.null()),
  status: agentRunStatusValidator,
  surface: agentSurfaceValidator,
  threadId: v.union(v.string(), v.null()),
  title: v.string(),
  tripId: v.union(v.id('trips'), v.null()),
  updatedAt: v.number()
});

const event = v.object({
  at: v.number(),
  detail: v.union(v.string(), v.null()),
  id: v.id('agentRunEvents'),
  input: v.union(v.string(), v.null()),
  kind: agentRunEventKindValidator,
  label: v.string(),
  ok: v.union(v.boolean(), v.null()),
  output: v.union(v.string(), v.null()),
  seq: v.number(),
  toolName: v.union(v.string(), v.null())
});

const latestRun = run.pick('error', 'headline', 'id', 'status', 'title', 'updatedAt');

const rosterItem = v.object({
  activeRunCount: v.number(),
  assignedIssueCount: v.number(),
  description: v.string(),
  id: assistantAgentValidator,
  label: v.string(),
  lastActivityAt: v.union(v.number(), v.null()),
  latestRun: v.union(latestRun, v.null()),
  status: v.union(v.literal('failed'), v.literal('idle'), v.literal('working')),
  surface: agentSurfaceValidator
});

export const AgentRunValidators = {
  actor,
  event,
  related,
  rosterItem,
  run,
  status: agentRunStatusValidator
};

export type AgentRunView = Infer<typeof run>;
export type AgentRunEventView = Infer<typeof event>;
export type AgentRosterItem = Infer<typeof rosterItem>;

export const assistantRunTables = {
  agentRunEvents: defineTable({
    at: v.number(),
    detail: v.optional(v.string()),
    input: v.optional(v.string()),
    kind: agentRunEventKindValidator,
    label: v.string(),
    ok: v.optional(v.boolean()),
    organizationId: v.string(),
    output: v.optional(v.string()),
    runId: v.id('agentRuns'),
    seq: v.number(),
    toolName: v.optional(v.string())
  }).index('by_runId_and_seq', ['runId', 'seq']),
  agentRuns: defineTable({
    shortId: v.string(),
    /** Better Auth token identifier of `createdBy`; the run actor's agent-thread user id. */
    actorTokenIdentifier: v.optional(v.string()),
    /** The wait this run is suspended on (or about to suspend on), until a turn claims it. */
    activeWaitId: v.optional(v.id('agentWaits')),
    agentId: assistantAgentValidator,
    completedAt: v.optional(v.number()),
    createdBy: actor,
    discussionId: v.optional(v.id('discussions')),
    /** Discussion `updatedAt` at claim time, so the finish skips a stale last-message preview. */
    discussionUpdatedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    headline: v.optional(v.string()),
    issueId: v.optional(v.id('tripIssues')),
    kickoff: agentRunKickoffValidator,
    organizationId: v.string(),
    /** The discussion message the chat turn answers. */
    promptMessageId: v.optional(v.string()),
    proposalId: v.optional(v.id('tripProposals')),
    report: v.optional(v.string()),
    researchTask: v.optional(researchTaskValidator),
    researchResult: v.optional(researchResultValidator),
    /** Screen context the turn runs against (chat only). */
    screen: v.optional(assistantScreenValidator),
    startedAt: v.optional(v.number()),
    status: agentRunStatusValidator,
    surface: agentSurfaceValidator,
    threadId: v.optional(v.string()),
    title: v.string(),
    tripId: v.optional(v.id('trips')),
    /** Turns claimed so far; a run must keep one in reserve to resume from a wait. */
    turns: v.optional(v.number()),
    updatedAt: v.number(),
    /** `@convex-dev/workflow` id; set when the engine starts the run. */
    workflowId: v.optional(v.string())
  })
    .index('by_researchTask_parentRunId', ['researchTask.parentRunId'])
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
    .index('by_organizationId_and_agentId_and_updatedAt', [
      'organizationId',
      'agentId',
      'updatedAt'
    ])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_issueId_and_updatedAt', ['issueId', 'updatedAt'])
    .index('by_discussionId_and_updatedAt', ['discussionId', 'updatedAt'])
    .index('by_discussionId_and_status_and_updatedAt', ['discussionId', 'status', 'updatedAt'])
    .index('by_proposalId_and_updatedAt', ['proposalId', 'updatedAt'])
    .index('by_status_and_updatedAt', ['status', 'updatedAt'])
    .index('by_status_and_workflowId_and_updatedAt', ['status', 'workflowId', 'updatedAt'])
};
