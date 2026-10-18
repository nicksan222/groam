import { assistantAgents } from '@groam/ai/agents';
import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { requireWorkspace, workspaceRoster } from '#convex/modules/auth/workspace';
import { Notifications } from '#convex/modules/notifications/index';
import { insertWithShortId } from '#convex/modules/references/index';
import { TripIssues } from '#convex/modules/travel/issues/index';
import {
  isTripAdmin,
  loadTripContext,
  type MutableTripCtx,
  preserveIdeaReview,
  recordActivity,
  type TripCtx
} from '#convex/modules/travel/trips/ctx';
import { MAX_GROUP_MEMBERS } from '#convex/modules/travel/trips/visibility';
import { VersionApply } from './apply';
import { cloneTripContent } from './clone';
import { type DetailRebase, withResolvedDetails } from './detailrebase';
import { VersionChanges } from './diff';
import { IdeaNames } from './names';
import { VersionPresentation } from './presentation';
import { countedApprovals, eligibleReviewers, independentReviewers } from './quorum';
import { type ConflictResolution, VersionMerge } from './resolution';
import { ReviewSettings } from './settings';
import { type VersionSnapshot, VersionSnapshots } from './snapshot/index';
import { GitCommits } from './validators';

type ProposalReviewer = NonNullable<Doc<'tripProposals'>['reviewers']>[number];
type FeedbackKind = 'change_request' | 'comment';

function ideaReviewer(): ProposalReviewer {
  const agent = assistantAgents.reviewer;
  return { agentId: agent.id, kind: 'agent', name: agent.label };
}

/** Idea reviewer is always assigned; human reviewers are opt-in on top. */
function withIdeaReviewer(reviewers: ProposalReviewer[]): ProposalReviewer[] {
  return [...reviewers.filter((reviewer) => reviewer.kind === 'user'), ideaReviewer()];
}

async function queueIdeaReviewerRun(
  ctx: MutationCtx,
  proposal: Doc<'tripProposals'>,
  /** The author's token (they submit the idea), so the reviewer turn acts as them. */
  actorTokenIdentifier: string
): Promise<void> {
  const reviewers = withIdeaReviewer(proposal.reviewers);
  if (!proposal.reviewers.some((reviewer) => reviewer.kind === 'agent')) {
    await ctx.db.patch('tripProposals', proposal._id, {
      reviewers,
      updatedAt: Date.now()
    });
  }
  const runId = await AgentRuns.queueReviewRun(ctx, {
    actorTokenIdentifier,
    createdBy: { name: proposal.author.name, userId: proposal.author.userId },
    organizationId: proposal.organizationId,
    proposalId: proposal._id,
    title: proposal.title,
    tripId: proposal.sourceTripId
  });
  await AgentEngine.start(ctx, runId);
}

const MAX_PROPOSALS = 50;
const MAX_PROPOSAL_APPROVALS = MAX_GROUP_MEMBERS;
const MAX_PROPOSAL_FEEDBACK = 200;
const MAX_PROPOSAL_FEEDBACK_LENGTH = 2_000;

function ideaNameFor(proposal: Doc<'tripProposals'>): string {
  return proposal.branchName;
}

async function baseSnapshotFor(
  ctx: MutationCtx | QueryCtx,
  proposal: Doc<'tripProposals'>
): Promise<VersionSnapshot> {
  const snapshot = await ctx.db
    .query('tripProposalSnapshots')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposal._id))
    .unique();
  if (!snapshot || snapshot.organizationId !== proposal.organizationId) {
    throw new ConvexError('The idea snapshot is unavailable');
  }
  return VersionSnapshots.fromStored(snapshot.value);
}

function assertCanPropose(trip: TripCtx): void {
  if (trip.trip.archive) throw new ConvexError('Archived trips are read-only');
}

async function existingIdeaForWorkingTrip(
  ctx: MutationCtx | QueryCtx,
  workingTripId: Id<'trips'>
): Promise<{
  ideaName: string;
  proposalId: Id<'tripProposals'>;
  workingTripId: Id<'trips'>;
} | null> {
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_workingTripId', (query) => query.eq('workingTripId', workingTripId))
    .unique();
  if (!proposal) return null;
  return {
    ideaName: ideaNameFor(proposal),
    proposalId: proposal._id,
    workingTripId: proposal.workingTripId
  };
}

/** Ideas may only branch from a shared trip — never from another idea's working copy. */
async function assertSharedTripIdeaSource(ctx: MutationCtx, source: TripCtx): Promise<void> {
  assertCanPropose(source);
  if (source.trip.proposal || (await existingIdeaForWorkingTrip(ctx, source.trip._id))) {
    throw new ConvexError('Start ideas from the shared trip');
  }
}

function assertCanMerge(trip: TripCtx): void {
  if (trip.trip.archive) throw new ConvexError('Archived trips are read-only');
  if (!isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can apply ideas');
  }
}

function canUpdateWorkingCopy(proposal: Doc<'tripProposals'>, source: TripCtx): boolean {
  return proposal.author.userId === source.workspace.userId || source.role === 'organizer';
}

function rebaseIsNeeded(proposal: Doc<'tripProposals'>, sourceChanged: boolean): boolean {
  return proposal.status === 'conflicted' || (proposal.status === 'in_review' && sourceChanged);
}

async function assertCanRebase(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>
): Promise<{ proposal: Doc<'tripProposals'>; source: MutableTripCtx }> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  if (!canUpdateWorkingCopy(proposal, source)) {
    throw new ConvexError('Only the idea author or a group admin can rebase');
  }
  if (proposal.status === 'merged' || proposal.status === 'closed') {
    throw new ConvexError('Closed or merged ideas cannot be rebased');
  }
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
    throw new ConvexError('Only ideas in review can be rebased');
  }
  if (!(proposal.baseCommit && proposal.tipCommit)) {
    throw new ConvexError('This idea is missing its change history');
  }
  return { proposal, source };
}

async function proposalWithSource<Ctx extends MutationCtx | QueryCtx>(
  ctx: Ctx,
  proposalId: Id<'tripProposals'>
): Promise<{ proposal: Doc<'tripProposals'>; source: TripCtx<Ctx> }> {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (!proposal) throw new ConvexError('Idea trip not found');
  const source = await loadTripContext(ctx, proposal.sourceTripId);
  return { proposal, source };
}

async function beginOperation({
  ctx,
  proposal,
  source,
  operation,
  requestedAt
}: {
  ctx: MutationCtx;
  proposal: Doc<'tripProposals'>;
  source: MutableTripCtx;
  operation:
    | { expectedWorkingUpdatedAt: number; kind: 'submit' }
    | {
        expectedProposalUpdatedAt: number;
        expectedSourceUpdatedAt: number;
        expectedWorkingUpdatedAt: number;
        kind: 'merge' | 'rebase';
      };
  requestedAt: number;
}): Promise<string> {
  const token = crypto.randomUUID();
  const existing = await ctx.db
    .query('tripProposalOperations')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposal._id))
    .unique();
  const value = {
    ...operation,
    organizationId: source.workspace.organizationId,
    proposalId: proposal._id,
    requestedAt,
    requestedBy: { name: source.workspace.viewerName, userId: source.workspace.userId },
    token
  };
  if (existing) await ctx.db.replace('tripProposalOperations', existing._id, value);
  else await ctx.db.insert('tripProposalOperations', value);
  return token;
}

async function approvalsForProposal(ctx: MutationCtx | QueryCtx, proposalId: Id<'tripProposals'>) {
  const approvals = await ctx.db
    .query('tripProposalApprovals')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .take(MAX_PROPOSAL_APPROVALS + 1);
  if (approvals.length > MAX_PROPOSAL_APPROVALS) {
    throw new ConvexError(`Ideas support up to ${MAX_PROPOSAL_APPROVALS} approvals`);
  }
  return approvals;
}

async function feedbackForProposal(ctx: QueryCtx, proposalId: Id<'tripProposals'>) {
  const comments = await ctx.db
    .query('tripProposalComments')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .take(MAX_PROPOSAL_FEEDBACK + 1);
  if (comments.length > MAX_PROPOSAL_FEEDBACK) {
    throw new ConvexError(`Ideas support up to ${MAX_PROPOSAL_FEEDBACK} feedback items`);
  }
  return comments.map((comment) => ({
    author: comment.author,
    changeKey: comment.changeKey ?? null,
    content: comment.content,
    createdAt: comment._creationTime,
    id: comment._id,
    // Feedback created before kinds were introduced blocked review, so preserve that behavior.
    kind: comment.kind,
    parentCommentId: comment.parentCommentId ?? null,
    reviewVerdict: comment.reviewVerdict ?? null,
    resolvedAt: comment.resolvedAt ?? null,
    updatedAt: comment.updatedAt
  }));
}

async function eligibleVoters(source: TripCtx) {
  const roster = await workspaceRoster(source, source.workspace);
  return roster.members;
}

async function notifyIdeaAudience(
  ctx: MutationCtx,
  source: TripCtx,
  proposal: Doc<'tripProposals'>,
  input: {
    body: string;
    kind: 'idea_applied' | 'idea_passed' | 'idea_shared';
    title: string;
    userIds?: string[];
  }
) {
  const voters = await eligibleVoters(source);
  const reviewerIds = [];
  for (const reviewer of proposal.reviewers) {
    if (reviewer.kind === 'user') reviewerIds.push(reviewer.userId);
  }
  const audience =
    input.userIds ??
    (reviewerIds.length > 0
      ? reviewerIds
      : voters.reduce<string[]>((userIds, voter) => {
          if (voter.userId !== proposal.author.userId) userIds.push(voter.userId);
          return userIds;
        }, []));
  await Notifications.notify(ctx, {
    body: input.body,
    href: `/ideas/${proposal._id}`,
    kind: input.kind,
    organizationId: source.workspace.organizationId,
    title: input.title,
    userIds: audience.filter((userId) => userId !== source.workspace.userId)
  });
}

function proposalTripData(
  source: TripCtx,
  now: number,
  ideaName: string
): Omit<Doc<'trips'>, '_creationTime' | '_id' | 'shortId'> {
  return {
    budget: source.trip.budget,
    clientRequestId: `proposal:${source.trip._id}:${source.workspace.userId}:${now}`,
    creationFingerprint: `proposal:${source.trip._id}:${source.trip.updatedAt}:${now}`,
    cover: source.trip.cover,
    creator: source.trip.creator,
    currency: source.trip.currency,
    dateNotes: source.trip.dateNotes,
    destination: source.trip.destination,
    duration: source.trip.duration,
    name: source.trip.name,
    organizationId: source.trip.organizationId,
    proposal: {
      author: { name: source.workspace.viewerName, userId: source.workspace.userId },
      baseUpdatedAt: source.trip.updatedAt,
      branchName: ideaName,
      sourceTripId: source.trip._id,
      status: 'draft'
    },
    startDate: source.trip.startDate,
    updatedAt: now
  };
}

async function findOpenProposal(ctx: MutationCtx, source: MutableTripCtx) {
  for (const status of ['draft', 'in_review', 'conflicted'] as const) {
    const proposal = await ctx.db
      .query('tripProposals')
      .withIndex('by_sourceTripId_and_author_userId_and_status', (query) =>
        query
          .eq('sourceTripId', source.trip._id)
          .eq('author.userId', source.workspace.userId)
          .eq('status', status)
      )
      .order('desc')
      .first();
    if (proposal) return proposal;
  }
  return null;
}

async function adoptOpenProposalForIssue(
  ctx: MutationCtx,
  source: MutableTripCtx,
  issueId: Id<'tripIssues'>,
  issue: Doc<'tripIssues'> | null
) {
  const existing = await findOpenProposal(ctx, source);
  if (!existing) return null;
  const working = await ctx.db.get('trips', existing.workingTripId);
  if (!working) throw new ConvexError('The existing idea is unavailable');
  if (existing.issueId && existing.issueId !== issueId) {
    throw new ConvexError('Close or send your current draft before implementing another question');
  }
  if (existing.issueId !== issueId) {
    const now = Date.now();
    await ctx.db.patch('tripProposals', existing._id, {
      issueId,
      updatedAt: now,
      ...(issue && (existing.titleSource === undefined || existing.titleSource === 'default')
        ? { title: `Implement: ${issue.title}`, titleSource: 'issue' as const }
        : {})
    });
  }
  return {
    ideaName: ideaNameFor(existing),
    proposalId: existing._id,
    workingTripId: existing.workingTripId
  };
}

async function issueForProposal(
  ctx: MutationCtx,
  source: MutableTripCtx,
  issueId: Id<'tripIssues'> | undefined
): Promise<Doc<'tripIssues'> | null> {
  if (!issueId) return null;
  const issue = await ctx.db.get('tripIssues', issueId);
  if (
    !issue ||
    issue.tripId !== source.trip._id ||
    issue.organizationId !== source.workspace.organizationId
  ) {
    throw new ConvexError('Trip issue not found');
  }
  return issue;
}

function proposalIdeaName({
  source,
  now,
  proposalCount,
  takenNames,
  requestedName
}: {
  source: MutableTripCtx;
  now: number;
  proposalCount: number;
  takenNames: Set<string>;
  requestedName: string | undefined;
}): string {
  if (requestedName === undefined) {
    return IdeaNames.uniqueFriendly(
      `${source.trip._id}:${source.workspace.userId}:${now}:${proposalCount}`,
      takenNames
    );
  }
  const ideaName = IdeaNames.custom(requestedName);
  if (takenNames.has(ideaName)) {
    throw new ConvexError(`An idea named “${ideaName}” already exists for this trip`);
  }
  return ideaName;
}

async function create(
  ctx: MutationCtx,
  sourceTripId: Id<'trips'>,
  options?: { ideaName?: string; issueId?: Id<'tripIssues'>; title?: string }
) {
  const source = await loadTripContext(ctx, sourceTripId);
  await assertSharedTripIdeaSource(ctx, source);
  const issue = await issueForProposal(ctx, source, options?.issueId);
  if (options?.issueId) {
    const adopted = await adoptOpenProposalForIssue(ctx, source, options.issueId, issue);
    if (adopted) return adopted;
  }
  const proposals = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) =>
      query.eq('sourceTripId', source.trip._id)
    )
    .take(MAX_PROPOSALS);
  if (proposals.length >= MAX_PROPOSALS) {
    throw new ConvexError(`Trips support up to ${MAX_PROPOSALS} ideas`);
  }

  const now = Date.now();
  const settings = await ReviewSettings.forOrganization(ctx, source.workspace.organizationId);
  const takenNames = new Set(proposals.map(ideaNameFor));
  const ideaName = proposalIdeaName({
    now,
    proposalCount: proposals.length,
    requestedName: options?.ideaName,
    source,
    takenNames
  });
  const baseSnapshot = await VersionSnapshots.create(ctx, source.trip);
  const baseSnapshotText = JSON.stringify(baseSnapshot);
  const workingTripId = await insertWithShortId(
    ctx,
    'trips',
    proposalTripData(source, now, ideaName)
  );
  await cloneTripContent(ctx, source, workingTripId);
  const proposalId = await insertWithShortId(ctx, 'tripProposals', {
    author: { name: source.workspace.viewerName, userId: source.workspace.userId },
    baseUpdatedAt: source.trip.updatedAt,
    branchName: ideaName,
    ...(options?.issueId ? { issueId: options.issueId } : {}),
    organizationId: source.workspace.organizationId,
    feedbackCount: 0,
    requiredApprovals: settings.requiredApprovals,
    reviewers: [ideaReviewer()],
    sourceTripId: source.trip._id,
    status: 'draft',
    title:
      options?.title?.trim() ||
      (issue ? `Implement: ${issue.title}` : `${source.workspace.viewerName}'s trip idea`),
    titleSource: options?.title?.trim() ? 'user' : issue ? 'issue' : 'default',
    unresolvedFeedbackCount: 0,
    updatedAt: now,
    workingTripId
  });
  await ctx.db.insert('tripProposalSnapshots', {
    organizationId: source.workspace.organizationId,
    proposalId,
    value: baseSnapshotText
  });
  await ctx.db.insert('tripAuditEvents', {
    actor: { name: source.workspace.viewerName, userId: source.workspace.userId },
    message: `${source.workspace.viewerName} started an idea`,
    tripId: source.trip._id,
    type: 'proposed_version_created'
  });
  return { ideaName, proposalId, workingTripId };
}

async function list(ctx: TripCtx<QueryCtx>) {
  const proposals = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', ctx.trip._id))
    .order('desc')
    .take(MAX_PROPOSALS + 1);
  if (proposals.length > MAX_PROPOSALS) {
    throw new ConvexError(`Trips support up to ${MAX_PROPOSALS} ideas`);
  }
  // Only ideas under review can still be approved or merged; the rest need no reads.
  const reviewing = proposals.filter((proposal) => proposal.status === 'in_review');
  const voters = reviewing.length > 0 ? await eligibleVoters(ctx) : [];
  const approvals = new Map(
    await Promise.all(
      reviewing.map(
        async (proposal) => [proposal._id, await approvalsForProposal(ctx, proposal._id)] as const
      )
    )
  );
  return proposals.map((proposal) => {
    const { capabilities, hasApproved } = reviewState(
      proposal,
      ctx,
      approvals.get(proposal._id) ?? [],
      voters
    );
    return {
      author: proposal.author,
      baseUpdatedAt: proposal.baseUpdatedAt,
      canApprove: capabilities.canApprove,
      canMerge: capabilities.canMerge,
      ideaName: ideaNameFor(proposal),
      conflictCount: proposal.conflictPaths?.length ?? 0,
      feedbackCount: proposal.feedbackCount,
      hasApproved,
      id: proposal._id,
      issueId: proposal.issueId ?? null,
      status: proposal.status,
      submittedAt: proposal.submittedAt ?? null,
      title: proposal.title,
      unresolvedFeedbackCount: proposal.unresolvedFeedbackCount,
      updatedAt: proposal.updatedAt,
      workingTripId: proposal.workingTripId
    };
  });
}

async function presentWorkspaceIdea(
  ctx: QueryCtx,
  proposal: Doc<'tripProposals'>,
  workspace: { organizationId: string; userId: string }
) {
  const source = await ctx.db.get('trips', proposal.sourceTripId);
  if (!source || source.organizationId !== workspace.organizationId) {
    throw new ConvexError('Idea source trip not found');
  }
  return {
    author: proposal.author,
    ideaName: ideaNameFor(proposal),
    id: proposal._id,
    reviewRequested:
      proposal.status === 'in_review' &&
      proposal.author.userId !== workspace.userId &&
      (!proposal.reviewers ||
        proposal.reviewers.some(
          (reviewer) => reviewer.kind === 'user' && reviewer.userId === workspace.userId
        )),
    sourceTripId: proposal.sourceTripId,
    sourceTripName: source.name,
    status: proposal.status,
    title: proposal.title,
    updatedAt: proposal.updatedAt,
    workingTripId: proposal.workingTripId
  };
}

async function listWorkspace(ctx: QueryCtx, paginationOpts: PaginationOptions) {
  const workspace = await requireWorkspace(ctx);
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > 25
  ) {
    throw new ConvexError('idea page size must be between 1 and 25');
  }
  const result = await ctx.db
    .query('tripProposals')
    .withIndex('by_organizationId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId)
    )
    .order('desc')
    .paginate(paginationOpts);
  const page = await Promise.all(
    result.page.map((proposal) => presentWorkspaceIdea(ctx, proposal, workspace))
  );
  return { ...result, page };
}

async function listViewerOpen(ctx: QueryCtx) {
  const workspace = await requireWorkspace(ctx);
  const found = await Promise.all(
    (['conflicted', 'draft', 'in_review'] as const).map((status) =>
      ctx.db
        .query('tripProposals')
        .withIndex('by_organizationId_and_author_userId_and_status', (query) =>
          query
            .eq('organizationId', workspace.organizationId)
            .eq('author.userId', workspace.userId)
            .eq('status', status)
        )
        .take(MAX_PROPOSALS)
    )
  );
  const proposals = found.flat().sort((left, right) => right.updatedAt - left.updatedAt);
  return Promise.all(proposals.map((proposal) => presentWorkspaceIdea(ctx, proposal, workspace)));
}

async function get(ctx: QueryCtx, proposalId: Id<'tripProposals'>) {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new ConvexError('Idea trip not found');
  const [approvals, voters, base, current, proposed] = await Promise.all([
    approvalsForProposal(ctx, proposalId),
    eligibleVoters(source),
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, source.trip),
    VersionSnapshots.create(ctx, working)
  ]);
  const { capabilities, eligibleApprovals, hasApproved, quorum, sourceChanged } = reviewState(
    proposal,
    source,
    approvals,
    voters
  );
  // Ask-list candidates stay independent-only; self-approval is not "asking yourself".
  const availableReviewers = independentReviewers(proposal, voters).map((voter) => ({
    kind: 'user' as const,
    name: voter.name,
    userId: voter.userId
  }));
  const issue = await linkedIssue(ctx, proposal.issueId);
  return {
    approvalCount: eligibleApprovals.length,
    approvals: eligibleApprovals
      .map((approval) =>
        approval.approver.kind === 'agent'
          ? {
              agentId: approval.approver.agentId,
              approvedAt: approval._creationTime,
              kind: 'agent' as const,
              name: approval.approver.name
            }
          : {
              approvedAt: approval._creationTime,
              name: approval.approver.name,
              userId: approval.approver.userId
            }
      )
      .sort((left, right) => left.approvedAt - right.approvedAt),
    author: proposal.author,
    availableReviewers,
    baseCommit: proposal.baseCommit ?? null,
    baseUpdatedAt: proposal.baseUpdatedAt,
    ideaName: ideaNameFor(proposal),
    ...capabilities,
    changes: await VersionPresentation.present(
      ctx,
      VersionChanges.diff(base, proposed),
      source.trip.organizationId
    ),
    closeReason: proposal.closeReason ?? null,
    conflicts: VersionChanges.conflicts(base, current, proposed, proposal.conflictPaths ?? []),
    feedbackCount: proposal.feedbackCount,
    groamReview: proposal.groamReview ?? null,
    hasApproved,
    id: proposal._id,
    issue,
    mergeCommit: proposal.mergeCommit ?? null,
    requiredApprovals: quorum,
    reviewers: proposal.reviewers,
    sourceChanged,
    sourceTripId: proposal.sourceTripId,
    status: proposal.status,
    submittedAt: proposal.submittedAt ?? null,
    tipCommit: proposal.tipCommit ?? null,
    title: proposal.title,
    unresolvedFeedbackCount: proposal.unresolvedFeedbackCount,
    updatedAt: proposal.updatedAt,
    workingTripId: proposal.workingTripId
  };
}

/**
 * What the viewer can do with a proposal, derived from its approvals and the trip's voters. The
 * detail and list queries both use this; the list only loads approvals for ideas in review, so
 * it reports `hasApproved` only there.
 */
function reviewState(
  proposal: Doc<'tripProposals'>,
  source: TripCtx<QueryCtx>,
  approvals: Array<Doc<'tripProposalApprovals'>>,
  voters: Awaited<ReturnType<typeof eligibleVoters>>
) {
  const eligibleIds = new Set(eligibleReviewers(proposal, voters).map((voter) => voter.userId));
  const eligibleApprovals = countedApprovals(proposal, approvals, eligibleIds);
  const quorum = proposal.requiredApprovals;
  const sourceChanged = source.trip.updatedAt !== proposal.baseUpdatedAt;
  const reviewReady =
    isTripAdmin(source) &&
    eligibleApprovals.length >= quorum &&
    proposal.unresolvedFeedbackCount === 0;
  return {
    capabilities: proposalCapabilities({
      eligibleIds,
      proposal,
      reviewReady,
      source,
      sourceChanged
    }),
    eligibleApprovals,
    hasApproved: eligibleApprovals.some(
      (approval) =>
        approval.approver.kind !== 'agent' && approval.approver.userId === source.workspace.userId
    ),
    quorum,
    sourceChanged
  };
}

function isOpenProposal(proposal: Doc<'tripProposals'>): boolean {
  return ['draft', 'in_review', 'conflicted'].includes(proposal.status);
}

function proposalCapabilities({
  proposal,
  source,
  eligibleIds,
  reviewReady,
  sourceChanged
}: {
  proposal: Doc<'tripProposals'>;
  source: TripCtx<QueryCtx>;
  eligibleIds: Set<string>;
  reviewReady: boolean;
  sourceChanged: boolean;
}) {
  return {
    canApprove: proposal.status === 'in_review' && eligibleIds.has(source.workspace.userId),
    canClose: isOpenProposal(proposal) && canManageReviewers(proposal, source),
    canManageReviewers: reviewersCanBeChanged(proposal) && canManageReviewers(proposal, source),
    canMerge: proposal.status === 'in_review' && reviewReady,
    canRebase: canUpdateWorkingCopy(proposal, source) && rebaseIsNeeded(proposal, sourceChanged),
    canResolve: proposal.status === 'conflicted' && reviewReady
  };
}

async function linkedIssue(ctx: QueryCtx, issueId: Id<'tripIssues'> | undefined) {
  if (!issueId) return null;
  const issue = await ctx.db.get('tripIssues', issueId);
  return issue ? { id: issue._id, status: issue.status, title: issue.title } : null;
}

async function listFeedback(ctx: QueryCtx, proposalId: Id<'tripProposals'>) {
  await proposalWithSource(ctx, proposalId);
  return await feedbackForProposal(ctx, proposalId);
}

type AgentReviewVerdict = 'approve' | 'comment' | 'request_changes';
type AgentReviewComment = { body: string; kind: 'change_request' | 'comment' };
type AgentReview = {
  comments: AgentReviewComment[];
  expectedReviewRevision: string;
  runId: Id<'agentRuns'>;
  summary: string;
  verdict: AgentReviewVerdict;
};

const AGENT_REVIEWER = { agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' } as const;
const MAX_AGENT_REVIEW_COMMENTS = 6;
const AGENT_REVIEW_VERDICTS = {
  approve: 'approved',
  comment: 'commented',
  request_changes: 'changes_requested'
} as const;

async function syncAgentApproval(
  ctx: MutationCtx,
  proposal: Doc<'tripProposals'>,
  approve: boolean
): Promise<void> {
  const existing = (await approvalsForProposal(ctx, proposal._id)).filter(
    (approval) => approval.approver.kind === 'agent'
  );
  if (!approve) {
    await Promise.all(existing.map((approval) => ctx.db.delete(approval._id)));
    return;
  }
  if (existing.length > 0) return;
  await ctx.db.insert('tripProposalApprovals', {
    approver: AGENT_REVIEWER,
    organizationId: proposal.organizationId,
    proposalId: proposal._id,
    sourceTripId: proposal.sourceTripId
  });
}

async function agentReviewSnapshot(
  ctx: MutationCtx | QueryCtx,
  proposal: Doc<'tripProposals'>,
  working: Doc<'trips'>
) {
  const [base, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, working)
  ]);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([proposal.title, base.files, proposed.files]))
  );
  const revision = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return { base, proposed, revision };
}

async function requireCurrentAgentReview(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  review: AgentReview
): Promise<Doc<'tripProposals'>> {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (!proposal) throw new ConvexError('Idea trip not found');
  if (!proposal.reviewers.some((reviewer) => reviewer.kind === 'agent')) {
    throw new ConvexError('Idea reviewer is not assigned to review this idea');
  }
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
    throw new ConvexError('The idea reviewer can only review an open idea');
  }
  const [working, run] = await Promise.all([
    ctx.db.get('trips', proposal.workingTripId),
    ctx.db.get('agentRuns', review.runId)
  ]);
  if (
    run?.status !== 'running' ||
    run.agentId !== 'reviewer' ||
    run.proposalId !== proposalId ||
    run.organizationId !== proposal.organizationId
  ) {
    throw new ConvexError('Idea review is no longer active');
  }
  // Check the reviewed content and execution owner in the same transaction as the verdict.
  if (!working) {
    throw new ConvexError('This idea changed during review. Request a new review.');
  }
  const snapshot = await agentReviewSnapshot(ctx, proposal, working);
  if (snapshot.revision !== review.expectedReviewRevision) {
    throw new ConvexError('This idea changed during review. Request a new review.');
  }
  return proposal;
}

async function finishAgentReview(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  review: AgentReview
): Promise<null> {
  const proposal = await requireCurrentAgentReview(ctx, proposalId, review);
  const cleanSummary = review.summary.trim();
  if (cleanSummary.length === 0 || cleanSummary.length > MAX_PROPOSAL_FEEDBACK_LENGTH) {
    throw new ConvexError(
      `Idea review summaries must contain 1 to ${MAX_PROPOSAL_FEEDBACK_LENGTH} characters`
    );
  }
  if (review.comments.length > MAX_AGENT_REVIEW_COMMENTS) {
    throw new ConvexError(`Idea reviews support up to ${MAX_AGENT_REVIEW_COMMENTS} comments`);
  }
  const cleaned = review.comments.map((comment) => ({
    body: comment.body.trim(),
    kind: comment.kind
  }));
  if (
    cleaned.some(
      (comment) => comment.body.length === 0 || comment.body.length > MAX_PROPOSAL_FEEDBACK_LENGTH
    )
  ) {
    throw new ConvexError(
      `Groam review comments must contain 1 to ${MAX_PROPOSAL_FEEDBACK_LENGTH} characters`
    );
  }
  const feedbackCount = proposal.feedbackCount;
  if (feedbackCount + cleaned.length + 1 > MAX_PROPOSAL_FEEDBACK) {
    throw new ConvexError(`Ideas support up to ${MAX_PROPOSAL_FEEDBACK} feedback items`);
  }
  const blocking = cleaned.filter((comment) => comment.kind === 'change_request').length;
  const verdict = review.verdict === 'approve' && blocking > 0 ? 'request_changes' : review.verdict;
  const now = Date.now();
  const base = {
    author: AGENT_REVIEWER,
    organizationId: proposal.organizationId,
    proposalId,
    sourceTripId: proposal.sourceTripId,
    updatedAt: now
  };
  // The summary is the review body; it goes first so it renders above the individual comments.
  await ctx.db.insert('tripProposalComments', {
    ...base,
    content: cleanSummary,
    kind: 'comment',
    reviewVerdict: AGENT_REVIEW_VERDICTS[verdict]
  });
  for (const comment of cleaned) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Comments list by _creationTime; sequential inserts keep them in the reviewer's order.
    await ctx.db.insert('tripProposalComments', {
      ...base,
      content: comment.body,
      kind: comment.kind
    });
  }
  const approve = verdict === 'approve' && proposal.status === 'in_review';
  await syncAgentApproval(ctx, proposal, approve);
  const changesRequested = verdict === 'request_changes' || blocking > 0;
  await ctx.db.patch('tripProposals', proposalId, {
    feedbackCount: feedbackCount + cleaned.length + 1,
    groamReview: {
      commentCount: cleaned.length,
      completedAt: now,
      status: changesRequested ? 'changes_requested' : 'passed',
      summary: cleanSummary
    },
    unresolvedFeedbackCount: proposal.unresolvedFeedbackCount + blocking,
    updatedAt: now
  });
  await AgentWaits.signal(ctx, { kind: 'proposal', refId: proposalId });
  return null;
}

function uniqueUserReviewers(reviewers: NonNullable<Doc<'tripProposals'>['reviewers']>) {
  return reviewers.filter(
    (reviewer): reviewer is Extract<ProposalReviewer, { kind: 'user' }> =>
      reviewer.kind === 'user' &&
      reviewers.findIndex(
        (candidate) => candidate.kind === 'user' && candidate.userId === reviewer.userId
      ) === reviewers.indexOf(reviewer)
  );
}

async function assertEligibleReviewers(
  source: MutableTripCtx,
  proposal: Doc<'tripProposals'>,
  reviewers: Extract<ProposalReviewer, { kind: 'user' }>[]
): Promise<void> {
  const voters = await eligibleVoters(source);
  const voterIds = new Set(voters.map((voter) => voter.userId));
  if (
    reviewers.some(
      (reviewer) => reviewer.userId === proposal.author.userId || !voterIds.has(reviewer.userId)
    )
  ) {
    throw new ConvexError('Requested reviewers must be group members other than the author');
  }
}

function canManageReviewers(
  proposal: Doc<'tripProposals'>,
  source: TripCtx<MutationCtx | QueryCtx>
): boolean {
  return proposal.author.userId === source.workspace.userId || source.role === 'organizer';
}

function reviewersCanBeChanged(proposal: Doc<'tripProposals'>): boolean {
  return proposal.status !== 'merged' && proposal.status !== 'closed';
}

function assertFeedbackContent(proposal: Doc<'tripProposals'>, rawContent: string): string {
  if (!['draft', 'in_review', 'conflicted'].includes(proposal.status)) {
    throw new ConvexError('Feedback can only be added to an open idea');
  }
  const content = rawContent.trim();
  if (content.length === 0 || content.length > MAX_PROPOSAL_FEEDBACK_LENGTH) {
    throw new ConvexError(`Feedback must contain 1 to ${MAX_PROPOSAL_FEEDBACK_LENGTH} characters`);
  }
  if (proposal.feedbackCount >= MAX_PROPOSAL_FEEDBACK) {
    throw new ConvexError(`Ideas support up to ${MAX_PROPOSAL_FEEDBACK} feedback items`);
  }
  return content;
}

async function assertReplyTarget(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  organizationId: string,
  parentCommentId: Id<'tripProposalComments'> | undefined
): Promise<void> {
  if (!parentCommentId) return;
  const parent = await ctx.db.get('tripProposalComments', parentCommentId);
  if (!parent || parent.proposalId !== proposalId || parent.organizationId !== organizationId) {
    throw new ConvexError('The conversation being replied to was not found');
  }
  if (parent.parentCommentId) {
    throw new ConvexError('Replies must belong to a top-level conversation');
  }
}

async function setReviewers(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  reviewers: NonNullable<Doc<'tripProposals'>['reviewers']>
): Promise<null> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  if (!canManageReviewers(proposal, source)) {
    throw new ConvexError('Only the idea author or an organizer can request reviewers');
  }
  if (!reviewersCanBeChanged(proposal)) {
    throw new ConvexError('Closed ideas cannot request reviewers');
  }
  const uniqueHumans = uniqueUserReviewers(reviewers);
  const unique = withIdeaReviewer(uniqueHumans);
  if (unique.length > MAX_GROUP_MEMBERS) throw new ConvexError('Too many reviewers');
  await assertEligibleReviewers(source, proposal, uniqueHumans);
  await ctx.db.patch('tripProposals', proposalId, { reviewers: unique, updatedAt: Date.now() });
  return null;
}

/**
 * Asks a member to review the idea whose working trip `ctx` is editing, e.g. because a change
 * assigns them work. A no-op outside ideas, for the author, or for existing reviewers.
 */
async function requestReview(
  ctx: MutableTripCtx,
  userId: string,
  /** Completes "{viewer} …", e.g. "asked you to bring something". */
  reason: string
): Promise<void> {
  if (!ctx.trip.proposal) return;
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_workingTripId', (query) => query.eq('workingTripId', ctx.trip._id))
    .unique();
  if (!proposal || !reviewersCanBeChanged(proposal) || proposal.author.userId === userId) return;
  const humans = uniqueUserReviewers(proposal.reviewers);
  if (humans.some((reviewer) => reviewer.userId === userId)) return;
  if (humans.length + 1 >= MAX_GROUP_MEMBERS) return;
  const member = (await eligibleVoters(ctx)).find((voter) => voter.userId === userId);
  if (!member) return;
  const reviewers = withIdeaReviewer([...humans, { kind: 'user', name: member.name, userId }]);
  await ctx.db.patch('tripProposals', proposal._id, { reviewers, updatedAt: Date.now() });
  // Drafts notify every reviewer on submit; only live ideas need a nudge now.
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') return;
  if (userId === ctx.workspace.userId) return;
  await Notifications.notify(ctx, {
    body: `${ctx.workspace.viewerName} ${reason} in “${proposal.title}”.`,
    href: `/ideas/${proposal._id}`,
    kind: 'idea_review_requested',
    organizationId: ctx.workspace.organizationId,
    title: 'Your review is requested',
    userIds: [userId]
  });
}

async function addFeedback({
  ctx,
  proposalId,
  rawContent,
  parentCommentId,
  changeKey,
  kind = 'comment'
}: {
  ctx: MutationCtx;
  proposalId: Id<'tripProposals'>;
  rawContent: string;
  parentCommentId?: Id<'tripProposalComments'>;
  changeKey?: string;
  kind?: FeedbackKind;
}): Promise<Id<'tripProposalComments'>> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  const content = assertFeedbackContent(proposal, rawContent);
  await assertReplyTarget(ctx, proposalId, source.workspace.organizationId, parentCommentId);
  const now = Date.now();
  const commentId = await ctx.db.insert('tripProposalComments', {
    author: { name: source.workspace.viewerName, userId: source.workspace.userId },
    ...(changeKey?.trim() && !parentCommentId ? { changeKey: changeKey.trim() } : {}),
    content,
    kind: parentCommentId ? 'comment' : kind,
    organizationId: source.workspace.organizationId,
    parentCommentId,
    proposalId,
    sourceTripId: source.trip._id,
    updatedAt: now
  });
  await ctx.db.patch('tripProposals', proposalId, {
    feedbackCount: proposal.feedbackCount + 1,
    unresolvedFeedbackCount:
      proposal.unresolvedFeedbackCount + (parentCommentId || kind !== 'change_request' ? 0 : 1),
    updatedAt: now
  });
  return commentId;
}

async function resolveFeedback(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  commentId: Id<'tripProposalComments'>,
  resolved: boolean
): Promise<null> {
  const [{ proposal, source }, comment] = await Promise.all([
    proposalWithSource(ctx, proposalId),
    ctx.db.get('tripProposalComments', commentId)
  ]);
  if (
    !comment ||
    comment.proposalId !== proposalId ||
    comment.organizationId !== source.workspace.organizationId
  ) {
    throw new ConvexError('Idea feedback not found');
  }
  if (comment.parentCommentId) {
    throw new ConvexError('Resolve the top-level conversation instead of an individual reply');
  }
  if (comment.kind !== 'change_request') {
    throw new ConvexError('Only change requests can be resolved');
  }
  if (proposal.author.userId !== source.workspace.userId && source.role !== 'organizer') {
    throw new ConvexError('Only the idea author or an organizer can resolve feedback');
  }
  if (resolved === Boolean(comment.resolvedAt)) return null;
  const now = Date.now();
  await Promise.all([
    ctx.db.patch('tripProposalComments', commentId, {
      resolvedAt: resolved ? now : undefined,
      resolvedBy: resolved
        ? { name: source.workspace.viewerName, userId: source.workspace.userId }
        : undefined,
      updatedAt: now
    }),
    ctx.db.patch('tripProposals', proposalId, {
      unresolvedFeedbackCount: Math.max(0, proposal.unresolvedFeedbackCount + (resolved ? -1 : 1)),
      updatedAt: now
    })
  ]);
  return null;
}

async function prepareSubmit(ctx: MutationCtx, proposalId: Id<'tripProposals'>) {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  if (proposal.status !== 'draft') throw new ConvexError('Only draft ideas can be submitted');
  if (proposal.author.userId !== source.workspace.userId) {
    throw new ConvexError('Only the idea author can submit it for review');
  }
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new ConvexError('Idea trip not found');
  const [base, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, working)
  ]);
  if (VersionSnapshots.match(base, proposed)) {
    throw new ConvexError('Make at least one change before requesting review');
  }
  const timestamp = Date.now();
  const token = await beginOperation({
    ctx,
    operation: { expectedWorkingUpdatedAt: working.updatedAt, kind: 'submit' },
    proposal,
    requestedAt: timestamp,
    source
  });
  return {
    history: {
      base: {
        identity: proposal.author,
        message: 'Base trip version',
        snapshot: base,
        timestamp: proposal.baseUpdatedAt
      },
      tip: {
        identity: proposal.author,
        message: 'Proposed trip version',
        snapshot: proposed,
        timestamp
      }
    },
    token
  };
}

async function finishSubmit({
  ctx,
  proposalId,
  token,
  baseCommit,
  tipCommit
}: {
  ctx: MutationCtx;
  proposalId: Id<'tripProposals'>;
  token: string;
  baseCommit: string;
  tipCommit: string;
}): Promise<null> {
  GitCommits.assertOid(baseCommit, 'base tip');
  GitCommits.assertOid(tipCommit, 'idea tip');
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  const [operation, working] = await Promise.all([
    ctx.db
      .query('tripProposalOperations')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
      .unique(),
    ctx.db.get('trips', proposal.workingTripId)
  ]);
  if (
    operation?.kind !== 'submit' ||
    operation.token !== token ||
    operation.requestedBy.userId !== source.workspace.userId ||
    operation.expectedWorkingUpdatedAt !== working?.updatedAt ||
    proposal.status !== 'draft' ||
    proposal.author.userId !== source.workspace.userId
  ) {
    throw new ConvexError('This idea can no longer be shared');
  }
  const timestamp = operation.requestedAt;
  await Promise.all([
    ctx.db.delete('tripProposalOperations', operation._id),
    ctx.db.patch('tripProposals', proposalId, {
      baseCommit,
      status: 'in_review',
      submittedAt: timestamp,
      tipCommit,
      updatedAt: timestamp
    }),
    ctx.db.patch('trips', proposal.workingTripId, {
      proposal: {
        author: proposal.author,
        baseUpdatedAt: proposal.baseUpdatedAt,
        branchName: ideaNameFor(proposal),
        sourceTripId: proposal.sourceTripId,
        status: 'in_review'
      },
      updatedAt: timestamp
    })
  ]);
  await notifyIdeaAudience(ctx, source, proposal, {
    body: `${proposal.author.name} sent “${proposal.title}” for the group to look at.`,
    kind: 'idea_shared',
    title: 'New idea on the trip'
  });
  await queueIdeaReviewerRun(
    ctx,
    {
      ...proposal,
      reviewers: withIdeaReviewer(proposal.reviewers),
      status: 'in_review',
      submittedAt: timestamp,
      tipCommit,
      baseCommit,
      updatedAt: timestamp
    },
    source.workspace.tokenIdentifier
  );
  return null;
}

async function setApproval(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  approved: boolean
): Promise<null> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  if (proposal.status !== 'in_review') {
    throw new ConvexError('Only ideas in review can be approved');
  }
  const voters = await eligibleVoters(source);
  const eligible = eligibleReviewers(proposal, voters);
  if (!eligible.some((voter) => voter.userId === source.workspace.userId)) {
    if (proposal.author.userId === source.workspace.userId) {
      throw new ConvexError('Idea authors cannot approve their own changes');
    }
    throw new ConvexError('You do not have permission to approve this idea');
  }
  const existing = await ctx.db
    .query('tripProposalApprovals')
    .withIndex('by_proposalId_and_approver_userId', (query) =>
      query.eq('proposalId', proposalId).eq('approver.userId', source.workspace.userId)
    )
    .unique();
  if (approved === Boolean(existing)) return null;
  if (approved) {
    await ctx.db.insert('tripProposalApprovals', {
      approver: { name: source.workspace.viewerName, userId: source.workspace.userId },
      organizationId: source.workspace.organizationId,
      proposalId,
      sourceTripId: source.trip._id
    });
  } else if (existing) await ctx.db.delete(existing._id);
  await AgentWaits.signal(ctx, { kind: 'proposal', refId: proposalId });
  return null;
}

async function assertMergeReady(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>
): Promise<{ proposal: Doc<'tripProposals'>; source: MutableTripCtx }> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  assertCanMerge(source);
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
    throw new ConvexError('Only ideas in review can be applied');
  }
  if (!(proposal.baseCommit && proposal.tipCommit)) {
    throw new ConvexError('This idea is missing its change history');
  }
  const [approvals, voters] = await Promise.all([
    approvalsForProposal(ctx, proposalId),
    eligibleVoters(source)
  ]);
  const eligibleIds = new Set(eligibleReviewers(proposal, voters).map((voter) => voter.userId));
  const approvalCount = countedApprovals(proposal, approvals, eligibleIds).length;
  const quorum = proposal.requiredApprovals;
  if (proposal.unresolvedFeedbackCount > 0) {
    throw new ConvexError('Resolve all idea feedback before applying');
  }
  if (approvalCount < quorum) {
    throw new ConvexError(
      `This proposal needs ${quorum} approval${quorum === 1 ? '' : 's'} before it can be applied`
    );
  }
  return { proposal, source };
}

async function prepareMerge(ctx: MutationCtx, proposalId: Id<'tripProposals'>) {
  const { proposal, source } = await assertMergeReady(ctx, proposalId);
  if (proposal.status !== 'in_review') throw new ConvexError('Resolve conflicts before applying');
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new ConvexError('Idea trip not found');
  const [base, current, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, source.trip),
    VersionSnapshots.create(ctx, working)
  ]);
  const timestamp = Date.now();
  const token = await beginOperation({
    ctx,
    operation: {
      expectedProposalUpdatedAt: proposal.updatedAt,
      expectedSourceUpdatedAt: source.trip.updatedAt,
      expectedWorkingUpdatedAt: working.updatedAt,
      kind: 'merge'
    },
    proposal,
    requestedAt: timestamp,
    source
  });
  return {
    history: {
      base: {
        identity: proposal.author,
        message: 'Base trip version',
        snapshot: base,
        timestamp: proposal.baseUpdatedAt
      },
      current: {
        identity: { name: source.workspace.viewerName, userId: source.workspace.userId },
        message: 'Current trip version',
        snapshot: current,
        timestamp: source.trip.updatedAt
      },
      merge: {
        identity: { name: source.workspace.viewerName, userId: source.workspace.userId },
        message: 'Merge proposed trip version',
        timestamp
      },
      tip: {
        identity: proposal.author,
        message: 'Proposed trip version',
        snapshot: proposed,
        timestamp: proposal.submittedAt ?? timestamp
      }
    },
    token
  };
}

async function finishMerge({
  ctx,
  proposalId,
  token,
  baseCommit,
  tipCommit,
  mergeCommit,
  mergedSnapshot
}: {
  ctx: MutationCtx;
  proposalId: Id<'tripProposals'>;
  token: string;
  baseCommit: string;
  tipCommit: string;
  mergeCommit: string;
  mergedSnapshot: VersionSnapshot;
}): Promise<null> {
  GitCommits.assertOid(baseCommit, 'base tip');
  GitCommits.assertOid(tipCommit, 'idea tip');
  GitCommits.assertOid(mergeCommit, 'applied tip');
  const { proposal, source } = await assertMergeReady(ctx, proposalId);
  const [operation, working] = await Promise.all([
    ctx.db
      .query('tripProposalOperations')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
      .unique(),
    ctx.db.get('trips', proposal.workingTripId)
  ]);
  if (
    operation?.kind !== 'merge' ||
    operation.token !== token ||
    operation.requestedBy.userId !== source.workspace.userId ||
    operation.expectedProposalUpdatedAt !== proposal.updatedAt ||
    operation.expectedSourceUpdatedAt !== source.trip.updatedAt ||
    operation.expectedWorkingUpdatedAt !== working?.updatedAt
  ) {
    throw new ConvexError('This idea can no longer be applied');
  }
  const timestamp = operation.requestedAt;
  await VersionApply.snapshot(ctx, source, mergedSnapshot);
  await Promise.all([
    ctx.db.delete('tripProposalOperations', operation._id),
    ctx.db.patch('tripProposals', proposalId, {
      baseCommit,
      mergeCommit,
      mergedAt: timestamp,
      conflictDetectedAt: undefined,
      conflictPaths: undefined,
      conflictSourceUpdatedAt: undefined,
      conflictWorkingUpdatedAt: undefined,
      status: 'merged',
      tipCommit,
      updatedAt: timestamp
    }),
    ctx.db.patch('trips', proposal.workingTripId, {
      proposal: {
        author: proposal.author,
        baseUpdatedAt: proposal.baseUpdatedAt,
        branchName: ideaNameFor(proposal),
        sourceTripId: proposal.sourceTripId,
        status: 'merged'
      },
      updatedAt: timestamp
    })
  ]);
  await AgentWaits.signal(ctx, { kind: 'proposal', refId: proposalId });
  if (proposal.issueId) {
    const issue = await ctx.db.get('tripIssues', proposal.issueId);
    if (issue?.tripId === source.trip._id) {
      await TripIssues.closeAfterMerge(ctx, issue, {
        actor: { name: source.workspace.viewerName, userId: source.workspace.userId },
        ideaTitle: proposal.title,
        timestamp
      });
    }
  }
  await recordActivity(
    source,
    'proposed_version_merged',
    `${source.workspace.viewerName} applied ${proposal.title}`
  );
  await notifyIdeaAudience(ctx, source, proposal, {
    body: `“${proposal.title}” is now on the shared trip.`,
    kind: 'idea_applied',
    title: 'Idea added to the trip',
    userIds: [proposal.author.userId]
  });
  return null;
}

async function markConflict(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  token: string,
  paths: string[]
): Promise<null> {
  const [{ proposal, source }, operation] = await Promise.all([
    proposalWithSource(ctx, proposalId),
    ctx.db
      .query('tripProposalOperations')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
      .unique()
  ]);
  if (
    operation?.kind !== 'merge' ||
    operation.token !== token ||
    operation.requestedBy.userId !== source.workspace.userId ||
    proposal.status !== 'in_review'
  ) {
    throw new ConvexError('This idea can no longer record conflicts');
  }
  const conflictPaths = [...new Set(paths)].sort();
  if (conflictPaths.length === 0 || conflictPaths.length > 525) {
    throw new ConvexError('Change history returned an invalid conflict list');
  }
  const timestamp = Date.now();
  await Promise.all([
    ctx.db.delete('tripProposalOperations', operation._id),
    ctx.db.patch('tripProposals', proposalId, {
      conflictDetectedAt: timestamp,
      conflictPaths,
      conflictSourceUpdatedAt: operation.expectedSourceUpdatedAt,
      conflictWorkingUpdatedAt: timestamp,
      status: 'conflicted',
      updatedAt: timestamp
    }),
    ctx.db.patch('trips', proposal.workingTripId, {
      proposal: {
        author: proposal.author,
        baseUpdatedAt: proposal.baseUpdatedAt,
        branchName: ideaNameFor(proposal),
        sourceTripId: proposal.sourceTripId,
        status: 'conflicted'
      },
      updatedAt: timestamp
    })
  ]);
  return null;
}

async function prepareResolution(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  resolutions: ConflictResolution[]
) {
  const { proposal, source } = await assertMergeReady(ctx, proposalId);
  if (proposal.status !== 'conflicted' || !proposal.conflictPaths) {
    throw new ConvexError('This idea has no conflicts to resolve');
  }
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new ConvexError('Idea trip not found');
  if (
    source.trip.updatedAt !== proposal.conflictSourceUpdatedAt ||
    working.updatedAt !== proposal.conflictWorkingUpdatedAt
  ) {
    throw new ConvexError('The trip changed again. Recheck conflicts before applying');
  }
  const [base, current, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, source.trip),
    VersionSnapshots.create(ctx, working)
  ]);
  const timestamp = Date.now();
  const resolution = VersionMerge.resolve({
    base,
    conflictPaths: proposal.conflictPaths,
    current,
    proposed,
    resolutions
  });
  const token = await beginOperation({
    ctx,
    operation: {
      expectedProposalUpdatedAt: proposal.updatedAt,
      expectedSourceUpdatedAt: source.trip.updatedAt,
      expectedWorkingUpdatedAt: working.updatedAt,
      kind: 'merge'
    },
    proposal,
    requestedAt: timestamp,
    source
  });
  return {
    history: {
      base: {
        identity: proposal.author,
        message: 'Base trip version',
        snapshot: base,
        timestamp: proposal.baseUpdatedAt
      },
      current: {
        identity: { name: source.workspace.viewerName, userId: source.workspace.userId },
        message: 'Current trip version',
        snapshot: current,
        timestamp: source.trip.updatedAt
      },
      merge: {
        identity: { name: source.workspace.viewerName, userId: source.workspace.userId },
        message: 'Resolve and merge proposed trip version',
        resolution,
        timestamp
      },
      tip: {
        identity: proposal.author,
        message: 'Proposed trip version',
        snapshot: proposed,
        timestamp: proposal.submittedAt ?? timestamp
      }
    },
    token
  };
}

async function prepareRebase(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  resolutions: ConflictResolution[],
  details?: DetailRebase
) {
  const { proposal, source } = await assertCanRebase(ctx, proposalId);
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new ConvexError('Idea trip not found');
  if (
    details &&
    (source.trip.updatedAt !== details.expectedSharedUpdatedAt ||
      working.updatedAt !== details.expectedWorkingUpdatedAt)
  ) {
    throw new ConvexError(
      'The trip changed while you were reviewing. Review the latest diff and try again.'
    );
  }
  const [base, current, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, source.trip),
    VersionSnapshots.create(ctx, working)
  ]);
  const conflictPaths = VersionMerge.conflicts(base, current, proposed);
  const chosenResolutions = details
    ? [
        ...resolutions.filter(({ path }) => path !== 'trip.json'),
        ...(conflictPaths.includes('trip.json')
          ? [{ choice: 'proposed' as const, path: 'trip.json' }]
          : [])
      ]
    : resolutions;
  if (conflictPaths.some((path) => !chosenResolutions.some((choice) => choice.path === path))) {
    return {
      conflicts: VersionChanges.conflicts(base, current, proposed, conflictPaths),
      kind: 'needs_choices' as const
    };
  }
  if (
    conflictPaths.length === 0 &&
    resolutions.length === 0 &&
    source.trip.updatedAt === proposal.baseUpdatedAt &&
    proposal.status !== 'conflicted'
  ) {
    return { kind: 'noop' as const };
  }
  const selected = details ? withResolvedDetails(current, proposed, details) : proposed;
  const resolved = VersionMerge.resolve({
    base,
    conflictPaths,
    current,
    proposed: selected,
    resolutions: chosenResolutions
  });
  const timestamp = Date.now();
  const token = await beginOperation({
    ctx,
    operation: {
      expectedProposalUpdatedAt: proposal.updatedAt,
      expectedSourceUpdatedAt: source.trip.updatedAt,
      expectedWorkingUpdatedAt: working.updatedAt,
      kind: 'rebase'
    },
    proposal,
    requestedAt: timestamp,
    source
  });
  return {
    history: {
      base: {
        identity: proposal.author,
        message: 'Rebased onto shared trip',
        snapshot: current,
        timestamp: source.trip.updatedAt
      },
      tip: {
        identity: proposal.author,
        message: 'Rebased idea',
        snapshot: resolved,
        timestamp: proposal.submittedAt ?? timestamp
      }
    },
    kind: 'apply' as const,
    rebasedSnapshot: resolved,
    token
  };
}

async function finishRebase({
  ctx,
  proposalId,
  token,
  baseCommit,
  tipCommit,
  rebasedSnapshot,
  baseSnapshot
}: {
  ctx: MutationCtx;
  proposalId: Id<'tripProposals'>;
  token: string;
  baseCommit: string;
  tipCommit: string;
  rebasedSnapshot: VersionSnapshot;
  baseSnapshot: VersionSnapshot;
}): Promise<null> {
  GitCommits.assertOid(baseCommit, 'base tip');
  GitCommits.assertOid(tipCommit, 'idea tip');
  const { proposal, source } = await assertCanRebase(ctx, proposalId);
  const [operation, workingDoc, stored] = await Promise.all([
    ctx.db
      .query('tripProposalOperations')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
      .unique(),
    ctx.db.get('trips', proposal.workingTripId),
    ctx.db
      .query('tripProposalSnapshots')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
      .unique()
  ]);
  if (
    operation?.kind !== 'rebase' ||
    operation.token !== token ||
    operation.requestedBy.userId !== source.workspace.userId ||
    operation.expectedProposalUpdatedAt !== proposal.updatedAt ||
    operation.expectedSourceUpdatedAt !== source.trip.updatedAt ||
    operation.expectedWorkingUpdatedAt !== workingDoc?.updatedAt ||
    !stored ||
    stored.organizationId !== proposal.organizationId ||
    !workingDoc
  ) {
    throw new ConvexError('This idea can no longer be rebased');
  }
  const working = await loadTripContext(ctx, proposal.workingTripId, source.workspace);
  await VersionApply.snapshot(ctx, preserveIdeaReview(working), rebasedSnapshot, {
    retainSourceKeys: true
  });
  const timestamp = Date.now();
  const ideaName = ideaNameFor(proposal);
  await Promise.all([
    ctx.db.delete('tripProposalOperations', operation._id),
    ctx.db.patch('tripProposalSnapshots', stored._id, {
      value: JSON.stringify(baseSnapshot)
    }),
    ctx.db.patch('tripProposals', proposalId, {
      baseCommit,
      baseUpdatedAt: source.trip.updatedAt,
      conflictDetectedAt: undefined,
      conflictPaths: undefined,
      conflictSourceUpdatedAt: undefined,
      conflictWorkingUpdatedAt: undefined,
      status: 'in_review',
      tipCommit,
      updatedAt: timestamp
    }),
    ctx.db.patch('trips', proposal.workingTripId, {
      proposal: {
        author: proposal.author,
        baseUpdatedAt: source.trip.updatedAt,
        branchName: ideaName,
        sourceTripId: proposal.sourceTripId,
        status: 'in_review'
      }
    })
  ]);
  return null;
}

async function cancelOperation(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  token: string
): Promise<null> {
  const operation = await ctx.db
    .query('tripProposalOperations')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .unique();
  if (operation?.token === token) await ctx.db.delete('tripProposalOperations', operation._id);
  return null;
}

async function close(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  reason?: string
): Promise<null> {
  const { proposal, source } = await proposalWithSource(ctx, proposalId);
  if (
    proposal.status !== 'draft' &&
    proposal.status !== 'in_review' &&
    proposal.status !== 'conflicted'
  ) {
    return null;
  }
  if (proposal.author.userId !== source.workspace.userId && source.role !== 'organizer') {
    throw new ConvexError('Only the author or an organizer can close this idea');
  }
  const closeReason = reason?.trim() ?? '';
  if (proposal.status !== 'draft' && closeReason.length === 0) {
    throw new ConvexError('Add a short note about why this idea is being passed on');
  }
  if (closeReason.length > 280) {
    throw new ConvexError('Pass-on notes must be 280 characters or fewer');
  }
  const now = Date.now();
  const operation = await ctx.db
    .query('tripProposalOperations')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .unique();
  await Promise.all([
    operation ? ctx.db.delete('tripProposalOperations', operation._id) : null,
    ctx.db.patch('tripProposals', proposalId, {
      closedAt: now,
      ...(closeReason ? { closeReason } : {}),
      status: 'closed',
      updatedAt: now
    }),
    ctx.db.patch('trips', proposal.workingTripId, {
      proposal: {
        author: proposal.author,
        baseUpdatedAt: proposal.baseUpdatedAt,
        branchName: ideaNameFor(proposal),
        sourceTripId: proposal.sourceTripId,
        status: 'closed'
      },
      updatedAt: now
    })
  ]);
  await AgentWaits.signal(ctx, { kind: 'proposal', refId: proposalId });
  await notifyIdeaAudience(ctx, source, proposal, {
    body: closeReason
      ? `${source.workspace.viewerName} passed on “${proposal.title}”: ${closeReason}`
      : `${source.workspace.viewerName} passed on “${proposal.title}”.`,
    kind: 'idea_passed',
    title: 'Idea passed on',
    userIds: [proposal.author.userId]
  });
  return null;
}

function tryNormalizeProposalTitle(value: string): string | null {
  try {
    return IdeaNames.normalizeTitle(value);
  } catch {
    return null;
  }
}

/** The idea's changes against its base, as reviewers and agents read them. */
async function presentProposalChanges(
  ctx: QueryCtx,
  proposal: Doc<'tripProposals'>,
  working: Doc<'trips'>
) {
  const [base, proposed] = await Promise.all([
    baseSnapshotFor(ctx, proposal),
    VersionSnapshots.create(ctx, working)
  ]);
  return VersionPresentation.present(
    ctx,
    VersionChanges.diff(base, proposed),
    proposal.organizationId
  );
}

/** What the Idea reviewer reads. Review runs are scheduled, so this needs no user session. */
async function reviewContext(ctx: QueryCtx, proposalId: Id<'tripProposals'>) {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (!proposal) throw new Error('Proposal not found');
  if (!proposal.reviewers.some((reviewer) => reviewer.kind === 'agent')) {
    throw new Error('Idea reviewer is not assigned to review this proposal');
  }
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
    throw new Error('Submit the proposal before requesting idea review');
  }
  const working = await ctx.db.get('trips', proposal.workingTripId);
  if (!working) throw new Error('Idea trip not found');
  const snapshot = await agentReviewSnapshot(ctx, proposal, working);
  return {
    changes: await VersionPresentation.present(
      ctx,
      VersionChanges.diff(snapshot.base, snapshot.proposed),
      proposal.organizationId
    ),
    expectedReviewRevision: snapshot.revision,
    organizationId: proposal.organizationId,
    sourceTripId: proposal.sourceTripId,
    title: proposal.title,
    workingTripId: proposal.workingTripId
  };
}

async function titleContext(ctx: QueryCtx, proposalId: Id<'tripProposals'>, generation: number) {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (
    !proposal ||
    !IdeaNames.allowsAutoTitle(proposal) ||
    proposal.titleGeneration !== generation
  ) {
    return null;
  }

  const [working, sourceTrip, issue] = await Promise.all([
    ctx.db.get('trips', proposal.workingTripId),
    ctx.db.get('trips', proposal.sourceTripId),
    proposal.issueId ? ctx.db.get('tripIssues', proposal.issueId) : null
  ]);
  if (!working || !sourceTrip) return null;

  const changes = await presentProposalChanges(ctx, proposal, working);
  if (changes.length === 0) return null;

  return {
    credentialOwnerUserId: proposal.author.userId,
    changes,
    issueTitle: issue?.title ?? null,
    organizationId: proposal.organizationId,
    sourceTripName: sourceTrip.name,
    title: proposal.title
  };
}

async function finishGeneratedTitle(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  generation: number,
  title: string
): Promise<null> {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (
    !proposal ||
    !IdeaNames.allowsAutoTitle(proposal) ||
    proposal.titleGeneration !== generation
  ) {
    return null;
  }

  const normalized = tryNormalizeProposalTitle(IdeaNames.clampAutoTitle(title));
  if (!normalized || normalized === proposal.title) return null;

  await ctx.db.patch('tripProposals', proposalId, {
    title: normalized,
    titleSource: 'auto',
    updatedAt: Date.now()
  });
  return null;
}

/** Ideas / proposals: create, review, merge, and conflict resolution. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripVersions {
  static addFeedback = addFeedback;
  static cancelOperation = cancelOperation;
  static close = close;
  static create = create;
  static existingForWorkingTrip = existingIdeaForWorkingTrip;
  static finishAgentReview = finishAgentReview;
  static finishGeneratedTitle = finishGeneratedTitle;
  static finishMerge = finishMerge;
  static finishRebase = finishRebase;
  static finishSubmit = finishSubmit;
  static get = get;
  static list = list;
  static listFeedback = listFeedback;
  static listViewerOpen = listViewerOpen;
  static listWorkspace = listWorkspace;
  static markConflict = markConflict;
  static prepareMerge = prepareMerge;
  static prepareRebase = prepareRebase;
  static prepareResolution = prepareResolution;
  static prepareSubmit = prepareSubmit;
  static requestReview = requestReview;
  static resolveFeedback = resolveFeedback;
  static reviewContext = reviewContext;
  static setApproval = setApproval;
  static setReviewers = setReviewers;
  static titleContext = titleContext;
}
