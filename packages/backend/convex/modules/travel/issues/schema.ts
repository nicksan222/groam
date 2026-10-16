import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { issueAgentActorValidator } from '#convex/modules/assistant/validators/index';
import { RuleValidators } from '#convex/modules/travel/issues/rules/schema';

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
/** See `status.ts` for what each state means. */
const status = v.union(
  v.literal('open'),
  v.literal('in_progress'),
  v.literal('closed'),
  v.literal('wont_do')
);
/** See `checks.ts`. */
const conditionCheck = RuleValidators.tripCheck;
/** See `rules/`. */
const rule = RuleValidators.rule;
/**
 * When an issue counts as solved: checked by the system (`auto`, the starter decisions), written
 * by a person (`manual`), or composed by a person and checked by the system (`rule`).
 */
const condition = v.union(
  v.object({ check: conditionCheck, kind: v.literal('auto') }),
  v.object({ kind: v.literal('manual'), text: v.string() }),
  v.object({ kind: v.literal('rule'), rule })
);
/** What clients see; `met` is null for a manual condition. */
const presentedCondition = v.union(
  v.null(),
  v.object({ kind: v.literal('manual'), label: v.string(), met: v.null() }),
  v.object({
    check: conditionCheck,
    kind: v.literal('auto'),
    label: v.string(),
    met: v.boolean(),
    /** What a person gets told when they try to close it unmet or reopen it met. */
    refusal: v.string()
  }),
  RuleValidators.presentedRule
);
/** Issue labels; `mandatory` marks the starter decisions every new trip gets. */
const label = v.literal('mandatory');
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
  /** Whether the viewer may assign this issue: organizers only, never on an archived trip. */
  canAssign: v.boolean(),
  /** Whether the viewer may change status and board position; false on an archived trip. */
  canManage: v.boolean(),
  closedAt: v.union(v.number(), v.null()),
  condition: presentedCondition,
  dueAt: v.union(v.number(), v.null()),
  id: v.id('tripIssues'),
  shortId: v.optional(v.string()),
  idea,
  labels: v.array(label),
  /** Board order within a status lane, ascending. Always defined; fractional. */
  rank: v.number(),
  status,
  title: v.string(),
  updatedAt: v.number()
});

export const TripIssueValidators = {
  actor,
  assignee,
  condition,
  conditionCheck,
  createInput: {
    body: v.string(),
    /** A "Done when…" criterion; the issue then has a manual condition. */
    doneWhen: v.optional(v.string()),
    /** A composed "Done when…" the system checks; takes the place of `doneWhen`. */
    rule: v.optional(rule),
    title: v.string()
  },
  detail: listItem.extend({
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
  label,
  listItem,
  presentedCondition,
  rule,
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
  })
    .index('by_issueId', ['issueId'])
    .index('by_issueId_and_kind', ['issueId', 'kind']),
  tripIssues: defineTable({
    shortId: v.optional(v.string()),
    assignee: v.optional(storedAssignee),
    author: actor,
    /** Omitted on rows created before the board; presented via `_creationTime`. */
    boardRank: v.optional(v.number()),
    body: v.string(),
    closedAt: v.optional(v.number()),
    /** Omitted on rows created before conditions. */
    condition: v.optional(condition),
    dueAt: v.optional(v.number()),
    /** Comments by kind, kept in step with the thread; omitted on rows from before the counters. */
    humanCommentCount: v.optional(v.number()),
    /** Omitted on rows created before labels. */
    labels: v.optional(v.array(label)),
    organizationId: v.string(),
    status,
    systemCommentCount: v.optional(v.number()),
    title: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
    .index('by_tripId_and_updatedAt', ['tripId', 'updatedAt'])
};
