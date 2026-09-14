import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { issueAgentActorValidator } from '#convex/modules/assistant/validators/index';

const actor = v.object({ name: v.string(), userId: v.string() });
const assignee = v.union(
  issueAgentActorValidator,
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() })
);
/** Stored rows may still say Groam from before the Issue agent split. */
const storedIssueAgentActor = v.object({
  agentId: v.union(v.literal('groam'), v.literal('issue')),
  kind: v.literal('agent'),
  name: v.string()
});
const storedAssignee = v.union(
  storedIssueAgentActor,
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() })
);
const commentAuthor = v.union(actor, storedIssueAgentActor);
const commentKind = v.union(v.literal('comment'), v.literal('system'));
const status = v.union(v.literal('open'), v.literal('closed'));
const idea = v.union(
  v.object({
    id: v.id('tripProposals'),
    status: v.union(
      v.literal('draft'),
      v.literal('in_review'),
      v.literal('conflicted'),
      v.literal('merged'),
      v.literal('closed')
    ),
    title: v.string(),
    workingTripId: v.id('trips')
  }),
  v.null()
);
const listItem = v.object({
  assignee: v.union(assignee, v.null()),
  author: actor,
  body: v.string(),
  closedAt: v.union(v.number(), v.null()),
  dueAt: v.union(v.number(), v.null()),
  id: v.id('tripIssues'),
  shortId: v.optional(v.string()),
  idea,
  status,
  title: v.string(),
  updatedAt: v.number()
});

export const TripIssueValidators = {
  actor,
  assignee,
  createInput: {
    body: v.string(),
    title: v.string()
  },
  detail: listItem.extend({
    canManage: v.boolean(),
    comments: v.array(
      v.object({
        author: commentAuthor,
        content: v.string(),
        createdAt: v.number(),
        id: v.id('tripIssueComments'),
        kind: commentKind,
        updatedAt: v.number()
      })
    ),
    tripId: v.id('trips'),
    tripName: v.string()
  }),
  idea,
  listItem,
  status,
  workspaceListItem: listItem.extend({
    tripId: v.id('trips'),
    tripName: v.string()
  })
};

export const tripIssueTables = {
  tripIssueComments: defineTable({
    author: commentAuthor,
    content: v.string(),
    issueId: v.id('tripIssues'),
    /** Omitted on legacy rows; presented as `comment`. */
    kind: v.optional(commentKind),
    organizationId: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  }).index('by_issueId', ['issueId']),
  tripIssues: defineTable({
    shortId: v.optional(v.string()),
    assignee: v.optional(storedAssignee),
    author: actor,
    body: v.string(),
    closedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    organizationId: v.string(),
    status,
    title: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
    .index('by_tripId_and_updatedAt', ['tripId', 'updatedAt'])
};
