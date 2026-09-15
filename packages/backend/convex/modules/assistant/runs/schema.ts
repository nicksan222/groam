import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import {
  agentRunEventKindValidator,
  agentRunKickoffValidator,
  agentRunStatusValidator,
  agentSurfaceValidator,
  assistantAgentValidator
} from '#convex/modules/assistant/validators/index';

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
  shortId: v.optional(v.string()),
  issueId: v.union(v.id('tripIssues'), v.null()),
  kickoff: agentRunKickoffValidator,
  proposalId: v.union(v.id('tripProposals'), v.null()),
  related,
  report: v.union(v.string(), v.null()),
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

const assignedIssue = v.object({
  id: v.id('tripIssues'),
  title: v.string(),
  tripId: v.id('trips'),
  updatedAt: v.number()
});

const assignedIssueActivity = {
  issueId: v.optional(v.union(v.id('tripIssues'), v.null())),
  proposalId: v.optional(v.union(v.id('tripProposals'), v.null())),
  tripId: v.optional(v.union(v.id('trips'), v.null()))
};

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
  assignedIssue,
  assignedIssueActivity,
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
    shortId: v.optional(v.string()),
    agentId: assistantAgentValidator,
    completedAt: v.optional(v.number()),
    createdBy: actor,
    discussionId: v.optional(v.id('discussions')),
    error: v.optional(v.string()),
    headline: v.optional(v.string()),
    issueId: v.optional(v.id('tripIssues')),
    kickoff: agentRunKickoffValidator,
    organizationId: v.string(),
    proposalId: v.optional(v.id('tripProposals')),
    report: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    status: agentRunStatusValidator,
    surface: agentSurfaceValidator,
    threadId: v.optional(v.string()),
    title: v.string(),
    tripId: v.optional(v.id('trips')),
    updatedAt: v.number()
  })
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
    .index('by_proposalId_and_updatedAt', ['proposalId', 'updatedAt'])
};
