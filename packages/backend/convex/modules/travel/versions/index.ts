import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { requireWorkspace, workspaceRoster } from '#convex/modules/auth/workspace';
import { Notifications } from '#convex/modules/notifications/index';
import { insertWithShortId } from '#convex/modules/references/index';
import {
  isTripAdmin,
  loadTripContext,
  MAX_GROUP_MEMBERS,
  type MutableTripCtx,
  preserveIdeaReview,
  recordActivity,
  type TripCtx
} from '#convex/modules/travel/trips/ctx';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { VersionApply } from './apply';
import { cloneTripContent } from './clone';
import { type DetailRebase, withResolvedDetails } from './detailrebase';
import { VersionChanges } from './diff';
import { IdeaNames } from './names';
import { VersionPresentation } from './presentation';
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
  proposal: Doc<'tripProposals'>
): Promise<void> {
  const reviewers = withIdeaReviewer(proposal.reviewers ?? []);
  if (!(proposal.reviewers ?? []).some((reviewer) => reviewer.kind === 'agent')) {
    await ctx.db.patch('tripProposals', proposal._id, {
      reviewers,
      updatedAt: Date.now()
    });
  }
  const runId = await AgentRuns.queueReviewRun(ctx, {
    createdBy: { name: proposal.author.name, userId: proposal.author.userId },
    organizationId: proposal.organizationId,
    proposalId: proposal._id,
    title: proposal.title,
    tripId: proposal.sourceTripId
  });
  await ctx.scheduler.runAfter(0, internal.modules.assistant.standalone.execute.run, { runId });
}

const MAX_PROPOSALS = 50;
const MAX_PROPOSAL_APPROVALS = MAX_GROUP_MEMBERS;
const MAX_PROPOSAL_FEEDBACK = 200;
const MAX_PROPOSAL_FEEDBACK_LENGTH = 2_000;

function ideaNameFor(proposal: Doc<'tripProposals'>): string {
  return proposal.branchName ?? IdeaNames.friendly(proposal._id);
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
    kind: comment.kind ?? 'change_request',
    parentCommentId: comment.parentCommentId ?? null,
    resolvedAt: comment.resolvedAt ?? null,
    updatedAt: comment.updatedAt
  }));
}

async function eligibleVoters(source: TripCtx) {
  const roster = await workspaceRoster(source, source.workspace);
  return roster.members;
}

/** Group members other than the idea author — preferred when independent review is possible. */
function independentReviewers(
  proposal: Doc<'tripProposals'>,
  voters: Awaited<ReturnType<typeof eligibleVoters>>
) {
  return voters.filter((voter) => voter.userId !== proposal.author.userId);
}

/** Human reviewers were explicitly asked — author must wait for an independent yes. */
function requiresIndependentReview(proposal: Doc<'tripProposals'>) {
  return (proposal.reviewers ?? []).some((reviewer) => reviewer.kind === 'user');
}

/**
 * Who may record an approval. When human reviewers were requested, the author is
 * excluded. Otherwise the author may self-approve and continue.
 */
function eligibleReviewers(
  proposal: Doc<'tripProposals'>,
  voters: Awaited<ReturnType<typeof eligibleVoters>>
) {
  if (requiresIndependentReview(proposal)) {
    return independentReviewers(proposal, voters);
  }
  return voters;
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
  for (const reviewer of proposal.reviewers ?? []) {
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
): Omit<Doc<'trips'>, '_creationTime' | '_id'> {
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
    requiredApprovals: settings.requiredApprovals,
    reviewers: [ideaReviewer()],
    sourceTripId: source.trip._id,
    status: 'draft',
    title:
      options?.title?.trim() ||
      (issue ? `Implement: ${issue.title}` : `${source.workspace.viewerName}'s trip idea`),
    titleSource: options?.title?.trim() ? 'user' : issue ? 'issue' : 'default',
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

async function list(ctx: QueryCtx, sourceTripId: Id<'trips'>) {
  await loadTripContext(ctx, sourceTripId);
  const proposals = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', sourceTripId))
    .order('desc')
    .take(MAX_PROPOSALS + 1);
  if (proposals.length > MAX_PROPOSALS) {
    throw new ConvexError(`Trips support up to ${MAX_PROPOSALS} ideas`);
  }
  return proposals.map((proposal) => ({
    author: proposal.author,
    baseUpdatedAt: proposal.baseUpdatedAt,
    ideaName: ideaNameFor(proposal),
    conflictCount: proposal.conflictPaths?.length ?? 0,
    feedbackCount: proposal.feedbackCount ?? 0,
    id: proposal._id,
    issueId: proposal.issueId ?? null,
    status: proposal.status,
    submittedAt: proposal.submittedAt ?? null,
    title: proposal.title,
    unresolvedFeedbackCount: proposal.unresolvedFeedbackCount ?? 0,
    updatedAt: proposal.updatedAt,
    workingTripId: proposal.workingTripId
  }));
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
  const eligibleIds = new Set(eligibleReviewers(proposal, voters).map((voter) => voter.userId));
  const eligibleApprovals = approvals.filter((approval) =>
    eligibleIds.has(approval.approver.userId)
  );
  const quorum = proposal.requiredApprovals ?? 1;
  // Ask-list candidates stay independent-only; self-approval is not "asking yourself".
  const availableReviewers = independentReviewers(proposal, voters).map((voter) => ({
    kind: 'user' as const,
    name: voter.name,
    userId: voter.userId
  }));
  const sourceChanged = source.trip.updatedAt !== proposal.baseUpdatedAt;
  const reviewReady =
    isTripAdmin(source) &&
    eligibleApprovals.length >= quorum &&
    (proposal.unresolvedFeedbackCount ?? 0) === 0;
  const capabilities = proposalCapabilities({
    eligibleIds,
    proposal,
    reviewReady,
    source,
    sourceChanged
  });
  const issue = await linkedIssue(ctx, proposal.issueId);
  return {
    approvalCount: eligibleApprovals.length,
    approvals: eligibleApprovals
      .map((approval) => ({
        approvedAt: approval._creationTime,
        name: approval.approver.name,
        userId: approval.approver.userId
      }))
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
    feedbackCount: proposal.feedbackCount ?? 0,
    groamReview: proposal.groamReview ?? null,
    hasApproved: eligibleApprovals.some(
      (approval) => approval.approver.userId === source.workspace.userId
    ),
    id: proposal._id,
    issue,
    mergeCommit: proposal.mergeCommit ?? null,
    requiredApprovals: quorum,
    reviewers: proposal.reviewers ?? [],
    sourceChanged,
    sourceTripId: proposal.sourceTripId,
    status: proposal.status,
    submittedAt: proposal.submittedAt ?? null,
    tipCommit: proposal.tipCommit ?? null,
    title: proposal.title,
    unresolvedFeedbackCount: proposal.unresolvedFeedbackCount ?? 0,
    updatedAt: proposal.updatedAt,
    workingTripId: proposal.workingTripId
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

async function finishAgentReview(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>,
  summary: string,
  comments: string[]
): Promise<null> {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (!proposal) throw new ConvexError('Idea trip not found');
  if (!(proposal.reviewers ?? []).some((reviewer) => reviewer.kind === 'agent')) {
    throw new ConvexError('Idea reviewer is not assigned to review this idea');
  }
  if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
    throw new ConvexError('The idea reviewer can only review an open idea');
  }
  const cleanSummary = summary.trim();
  if (cleanSummary.length === 0 || cleanSummary.length > 1_000) {
    throw new ConvexError('Idea review summaries must contain 1 to 1000 characters');
  }
  if (comments.length > 5) throw new ConvexError('Idea reviews support up to 5 comments');
  const cleanedComments = comments.map((comment) => comment.trim());
  if (
    cleanedComments.some(
      (comment) => comment.length === 0 || comment.length > MAX_PROPOSAL_FEEDBACK_LENGTH
    )
  ) {
    throw new ConvexError(
      `Groam review comments must contain 1 to ${MAX_PROPOSAL_FEEDBACK_LENGTH} characters`
    );
  }
  const feedbackCount = proposal.feedbackCount ?? 0;
  if (feedbackCount + cleanedComments.length > MAX_PROPOSAL_FEEDBACK) {
    throw new ConvexError(`Ideas support up to ${MAX_PROPOSAL_FEEDBACK} feedback items`);
  }
  const now = Date.now();
  await Promise.all(
    cleanedComments.map((content) =>
      ctx.db.insert('tripProposalComments', {
        author: { agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' },
        content,
        kind: 'change_request',
        organizationId: proposal.organizationId,
        proposalId,
        sourceTripId: proposal.sourceTripId,
        updatedAt: now
      })
    )
  );
  await ctx.db.patch('tripProposals', proposalId, {
    feedbackCount: feedbackCount + cleanedComments.length,
    groamReview: {
      commentCount: cleanedComments.length,
      completedAt: now,
      status: cleanedComments.length > 0 ? 'changes_requested' : 'passed',
      summary: cleanSummary
    },
    unresolvedFeedbackCount: (proposal.unresolvedFeedbackCount ?? 0) + cleanedComments.length,
    updatedAt: now
  });
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
  if ((proposal.feedbackCount ?? 0) >= MAX_PROPOSAL_FEEDBACK) {
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
    feedbackCount: (proposal.feedbackCount ?? 0) + 1,
    unresolvedFeedbackCount:
      (proposal.unresolvedFeedbackCount ?? 0) +
      (parentCommentId || kind !== 'change_request' ? 0 : 1),
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
  if ((comment.kind ?? 'change_request') !== 'change_request') {
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
      unresolvedFeedbackCount: Math.max(
        0,
        (proposal.unresolvedFeedbackCount ?? 0) + (resolved ? -1 : 1)
      ),
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
  await queueIdeaReviewerRun(ctx, {
    ...proposal,
    reviewers: withIdeaReviewer(proposal.reviewers ?? []),
    status: 'in_review',
    submittedAt: timestamp,
    tipCommit,
    baseCommit,
    updatedAt: timestamp
  });
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
  const approvalCount = approvals.filter((approval) =>
    eligibleIds.has(approval.approver.userId)
  ).length;
  const quorum = proposal.requiredApprovals ?? 1;
  if ((proposal.unresolvedFeedbackCount ?? 0) > 0) {
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
  if (proposal.issueId) {
    const issue = await ctx.db.get('tripIssues', proposal.issueId);
    if (issue?.status === 'open') {
      await ctx.db.patch('tripIssues', issue._id, {
        closedAt: timestamp,
        status: 'closed',
        updatedAt: timestamp
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

async function titleContext(ctx: QueryCtx, proposalId: Id<'tripProposals'>, generation: number) {
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (
    proposal?.status !== 'draft' ||
    !IdeaNames.allowsAutoTitle(proposal) ||
    proposal.titleGeneration !== generation
  ) {
    return null;
  }

  const [working, sourceTrip, issue, base] = await Promise.all([
    ctx.db.get('trips', proposal.workingTripId),
    ctx.db.get('trips', proposal.sourceTripId),
    proposal.issueId ? ctx.db.get('tripIssues', proposal.issueId) : null,
    baseSnapshotFor(ctx, proposal)
  ]);
  if (!working || !sourceTrip) return null;

  const changes = await VersionPresentation.present(
    ctx,
    VersionChanges.diff(base, await VersionSnapshots.create(ctx, working)),
    proposal.organizationId
  );
  if (changes.length === 0) return null;

  return {
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
    proposal?.status !== 'draft' ||
    !IdeaNames.allowsAutoTitle(proposal) ||
    proposal.titleGeneration !== generation
  ) {
    return null;
  }

  const normalized = tryNormalizeProposalTitle(title);
  if (!normalized || normalized === proposal.title) return null;

  await ctx.db.patch('tripProposals', proposalId, {
    title: normalized,
    titleSource: 'auto',
    updatedAt: Date.now()
  });
  return null;
}

/** Ideas / proposals: create, review, merge, and conflict resolution. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
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
  static resolveFeedback = resolveFeedback;
  static setApproval = setApproval;
  static setReviewers = setReviewers;
  static titleContext = titleContext;
}
