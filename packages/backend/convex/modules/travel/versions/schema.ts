import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { proposalAgentActorValidator } from '#convex/modules/assistant/validators/index';

const author = v.object({
  kind: v.optional(v.literal('user')),
  name: v.string(),
  userId: v.string()
});
const commentAuthor = v.union(author, proposalAgentActorValidator);
const commentKind = v.union(v.literal('comment'), v.literal('change_request'));
const reviewer = v.union(
  proposalAgentActorValidator,
  v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() })
);

const status = v.union(
  v.literal('draft'),
  v.literal('in_review'),
  v.literal('conflicted'),
  v.literal('merged'),
  v.literal('closed')
);

const proposalMetadata = v.object({
  author,
  baseUpdatedAt: v.number(),
  branchName: v.optional(v.string()),
  sourceTripId: v.id('trips'),
  status
});

export const TripVersionValidators = {
  author,
  commentKind,
  proposalMetadata,
  commentAuthor,
  reviewer,
  status
};

export const tripVersionTables = {
  tripReviewSettings: defineTable({
    organizationId: v.string(),
    requiredApprovals: v.number(),
    updatedAt: v.number(),
    updatedBy: author
  }).index('by_organizationId', ['organizationId']),
  tripProposalApprovals: defineTable({
    approver: author,
    organizationId: v.string(),
    proposalId: v.id('tripProposals'),
    sourceTripId: v.id('trips')
  })
    .index('by_proposalId', ['proposalId'])
    .index('by_proposalId_and_approver_userId', ['proposalId', 'approver.userId'])
    .index('by_sourceTripId_and_approver_userId', ['sourceTripId', 'approver.userId'])
    .index('by_organizationId_and_approver_userId', ['organizationId', 'approver.userId']),
  tripProposalOperations: defineTable(
    v.union(
      v.object({
        expectedWorkingUpdatedAt: v.number(),
        kind: v.literal('submit'),
        organizationId: v.string(),
        proposalId: v.id('tripProposals'),
        requestedAt: v.number(),
        requestedBy: author,
        token: v.string()
      }),
      v.object({
        expectedProposalUpdatedAt: v.number(),
        expectedSourceUpdatedAt: v.number(),
        expectedWorkingUpdatedAt: v.number(),
        kind: v.union(v.literal('merge'), v.literal('rebase')),
        organizationId: v.string(),
        proposalId: v.id('tripProposals'),
        requestedAt: v.number(),
        requestedBy: author,
        token: v.string()
      })
    )
  ).index('by_proposalId', ['proposalId']),
  tripProposalSnapshots: defineTable({
    organizationId: v.string(),
    proposalId: v.id('tripProposals'),
    value: v.string()
  }).index('by_proposalId', ['proposalId']),
  tripProposals: defineTable({
    shortId: v.optional(v.string()),
    author,
    baseCommit: v.optional(v.string()),
    baseUpdatedAt: v.number(),
    branchName: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    closeReason: v.optional(v.string()),
    conflictDetectedAt: v.optional(v.number()),
    conflictPaths: v.optional(v.array(v.string())),
    conflictSourceUpdatedAt: v.optional(v.number()),
    conflictWorkingUpdatedAt: v.optional(v.number()),
    feedbackCount: v.optional(v.number()),
    groamReview: v.optional(
      v.object({
        commentCount: v.number(),
        completedAt: v.number(),
        status: v.union(v.literal('changes_requested'), v.literal('passed')),
        summary: v.string()
      })
    ),
    issueId: v.optional(v.id('tripIssues')),
    mergeCommit: v.optional(v.string()),
    mergedAt: v.optional(v.number()),
    organizationId: v.string(),
    requiredApprovals: v.optional(v.number()),
    reviewers: v.optional(v.array(reviewer)),
    sourceTripId: v.id('trips'),
    status,
    submittedAt: v.optional(v.number()),
    tipCommit: v.optional(v.string()),
    title: v.string(),
    titleGeneration: v.optional(v.number()),
    titleSource: v.optional(
      v.union(v.literal('auto'), v.literal('default'), v.literal('issue'), v.literal('user'))
    ),
    unresolvedFeedbackCount: v.optional(v.number()),
    updatedAt: v.number(),
    workingTripId: v.id('trips')
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
    .index('by_organizationId_and_author_userId_and_status', [
      'organizationId',
      'author.userId',
      'status'
    ])
    .index('by_sourceTripId_and_updatedAt', ['sourceTripId', 'updatedAt'])
    .index('by_sourceTripId_and_author_userId_and_status', [
      'sourceTripId',
      'author.userId',
      'status'
    ])
    .index('by_issueId', ['issueId'])
    .index('by_workingTripId', ['workingTripId']),
  tripProposalComments: defineTable({
    author: commentAuthor,
    changeKey: v.optional(v.string()),
    content: v.string(),
    kind: v.optional(commentKind),
    organizationId: v.string(),
    parentCommentId: v.optional(v.id('tripProposalComments')),
    proposalId: v.id('tripProposals'),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(author),
    sourceTripId: v.id('trips'),
    updatedAt: v.number()
  }).index('by_proposalId', ['proposalId'])
};
