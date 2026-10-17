import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { issueAgentActorValidator } from '#convex/modules/assistant/validators/index';
import { RuleValidators } from '#convex/modules/travel/issues/rules/schema';

const actor = v.object({ name: v.string(), userId: v.string() });
const assignee = v.union(
  issueAgentActorValidator,
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() })
);
const commentAuthor = v.union(actor, issueAgentActorValidator);
const commentKind = v.union(v.literal('comment'), v.literal('system'));
/** See `status.ts` for what each state means. */
const status = v.union(
  v.literal('open'),
  v.literal('in_progress'),
  v.literal('closed'),
  v.literal('wont_do')
);
/** See `rules/`. */
const rule = RuleValidators.rule;
/**
 * When an issue counts as solved: written by a person (`manual`), or a rule the system checks
 * against the shared trip (`rule`). `starter` marks the decisions every trip opens with; those
 * cannot be edited or set aside.
 */
const conditionKinds = {
  manual: { kind: v.literal('manual'), text: v.string() },
  rule: { kind: v.literal('rule'), rule, starter: v.optional(v.boolean()) }
};
const condition = v.union(v.object(conditionKinds.manual), v.object(conditionKinds.rule));
/** A condition row belongs to one issue; `tripId` lets a trip change re-check them in one read. */
const conditionOwner = { issueId: v.id('tripIssues'), tripId: v.id('trips') };
/** What clients see; `met` is null for a manual condition. */
const presentedCondition = v.union(
  v.null(),
  v.object({ kind: v.literal('manual'), label: v.string(), met: v.null() }),
  RuleValidators.presentedRule.extend({ starter: v.boolean() })
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
  shortId: v.string(),
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
  createInput: {
    body: v.string(),
    /** A "Done when…" criterion; the issue then has a manual condition. */
    doneWhen: v.optional(v.string()),
    /** A composed "Done when…" the system checks; takes the place of `doneWhen`. */
    rule: v.optional(rule),
    title: v.string()
  },
  detail: listItem.extend({
    /** Whether the viewer may comment: any trip member, never on an archived trip. */
    canComment: v.boolean(),
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
    kind: commentKind,
    organizationId: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  })
    .index('by_issueId', ['issueId'])
    .index('by_issueId_and_kind', ['issueId', 'kind']),
  /** At most one per issue; an issue without a row has no "done when". */
  tripIssueConditions: defineTable(
    v.union(
      v.object({ ...conditionOwner, ...conditionKinds.manual }),
      v.object({ ...conditionOwner, ...conditionKinds.rule })
    )
  )
    .index('by_issueId', ['issueId'])
    .index('by_tripId', ['tripId']),
  tripIssues: defineTable({
    shortId: v.string(),
    assignee: v.optional(assignee),
    author: actor,
    /** Board order within a status lane, ascending; fractional. */
    boardRank: v.number(),
    body: v.string(),
    closedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    /** Comments by kind, kept in step with the thread. */
    humanCommentCount: v.number(),
    labels: v.array(label),
    organizationId: v.string(),
    status,
    systemCommentCount: v.number(),
    title: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
    .index('by_tripId_and_updatedAt', ['tripId', 'updatedAt'])
};
