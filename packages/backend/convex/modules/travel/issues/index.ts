import { assistantAgents, isIssueAssignableAgentId } from '@groam/ai-contracts/agents/registry';
import type { PaginationOptions } from 'convex/server';
import { ConvexError, type Infer } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { insertWithShortId } from '#convex/modules/references/index';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { isTripAdmin, loadTripContext } from '#convex/modules/travel/trips/ctx';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_ISSUES = 200;
const MAX_COMMENTS = 200;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 5_000;
const MAX_COMMENT_LENGTH = 2_000;

type Assignee = Doc<'tripIssues'>['assignee'];

async function issueWithTrip<Ctx extends MutationCtx | QueryCtx>(
  ctx: Ctx,
  issueId: Id<'tripIssues'>
) {
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) throw new ConvexError('Trip issue not found');
  const trip = await loadTripContext(ctx, issue.tripId);
  if (issue.organizationId !== trip.workspace.organizationId) {
    throw new ConvexError('Trip issue not found');
  }
  return { issue, trip };
}

function text(value: string, maximum: number, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new ConvexError(`${label} must contain 1 to ${maximum} characters`);
  }
  return normalized;
}

async function linkedProposal(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
    .order('desc')
    .first();
  return proposal
    ? {
        id: proposal._id,
        status: proposal.status,
        title: proposal.title,
        workingTripId: proposal.workingTripId
      }
    : null;
}

const issueAgentAssignee = {
  agentId: assistantAgents.issue.id,
  kind: 'agent' as const,
  name: assistantAgents.issue.label
};

function presentAssignee(
  assignee: Assignee | undefined
): Infer<typeof TripIssueValidators.assignee> | null {
  if (!assignee) return null;
  if (assignee.kind === 'agent') return issueAgentAssignee;
  return assignee;
}

function assigneeLabel(assignee: NonNullable<Assignee>): string {
  return presentAssignee(assignee)?.name ?? assignee.name;
}

function sameAssignee(current: Assignee | undefined, next: NonNullable<Assignee> | null): boolean {
  const left = presentAssignee(current);
  const right = next === null ? null : presentAssignee(next);
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  if (left.kind !== right.kind) return false;
  if (left.kind === 'agent' && right.kind === 'agent') return left.agentId === right.agentId;
  if (left.kind === 'user' && right.kind === 'user') return left.userId === right.userId;
  return false;
}

function assignmentMessage(
  actorName: string,
  previous: Assignee | undefined,
  next: NonNullable<Assignee> | null
): string {
  if (next === null) {
    return previous
      ? `${actorName} unassigned ${assigneeLabel(previous)}`
      : `${actorName} unassigned this`;
  }
  return `${actorName} assigned this to ${assigneeLabel(next)}`;
}

async function presentListItem(ctx: QueryCtx, issue: Doc<'tripIssues'>) {
  return {
    assignee: presentAssignee(issue.assignee),
    author: issue.author,
    body: issue.body,
    closedAt: issue.closedAt ?? null,
    dueAt: issue.dueAt ?? null,
    id: issue._id,
    ...(issue.shortId ? { shortId: issue.shortId } : {}),
    idea: await linkedProposal(ctx, issue._id),
    status: issue.status,
    title: issue.title,
    updatedAt: issue.updatedAt
  };
}

async function list(ctx: QueryCtx, tripId: Id<'trips'>) {
  await loadTripContext(ctx, tripId);
  const issues = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .order('desc')
    .take(MAX_ISSUES + 1);
  if (issues.length > MAX_ISSUES) throw new ConvexError(`Trips support up to ${MAX_ISSUES} issues`);
  return await Promise.all(issues.map((issue) => presentListItem(ctx, issue)));
}

async function listWorkspace(ctx: QueryCtx, paginationOpts: PaginationOptions) {
  const workspace = await requireWorkspace(ctx);
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > 25
  ) {
    throw new ConvexError('issue page size must be between 1 and 25');
  }
  const result = await ctx.db
    .query('tripIssues')
    .withIndex('by_organizationId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId)
    )
    .order('desc')
    .paginate(paginationOpts);

  const uniqueTripIds = [...new Set(result.page.map((issue) => issue.tripId))];
  const [trips, ideas] = await Promise.all([
    Promise.all(uniqueTripIds.map((tripId) => ctx.db.get('trips', tripId))),
    Promise.all(result.page.map((issue) => linkedProposal(ctx, issue._id)))
  ]);
  const tripById = new Map(
    uniqueTripIds.flatMap((tripId, index) => {
      const trip = trips[index];
      return trip ? [[tripId, trip] as const] : [];
    })
  );

  const page = result.page.map((issue, index) => {
    const trip = tripById.get(issue.tripId);
    if (!trip || trip.organizationId !== workspace.organizationId) {
      throw new ConvexError('Issue trip not found');
    }
    return {
      assignee: presentAssignee(issue.assignee),
      author: issue.author,
      body: issue.body,
      closedAt: issue.closedAt ?? null,
      dueAt: issue.dueAt ?? null,
      id: issue._id,
      ...(issue.shortId ? { shortId: issue.shortId } : {}),
      idea: ideas[index] ?? null,
      status: issue.status,
      title: issue.title,
      tripId: issue.tripId,
      tripName: trip.name,
      updatedAt: issue.updatedAt
    };
  });
  return { ...result, page };
}

async function get(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) return null;
  const workspace = await requireWorkspace(ctx);
  if (issue.organizationId !== workspace.organizationId) return null;
  const [loaded, comments, presented] = await Promise.all([
    loadTripContext(ctx, issue.tripId, workspace),
    ctx.db
      .query('tripIssueComments')
      .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
      .take(MAX_COMMENTS + 1),
    presentListItem(ctx, issue)
  ]);
  if (comments.length > MAX_COMMENTS) {
    throw new ConvexError(`Trip issues support up to ${MAX_COMMENTS} comments`);
  }
  return {
    ...presented,
    canManage: issue.author.userId === loaded.workspace.userId || isTripAdmin(loaded),
    comments: comments.map((comment) => ({
      author: comment.author,
      content: comment.content,
      createdAt: comment._creationTime,
      id: comment._id,
      kind: comment.kind ?? 'comment',
      updatedAt: comment.updatedAt
    })),
    tripId: issue.tripId,
    tripName: loaded.trip.name
  };
}

async function create(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  titleInput: string,
  bodyInput: string
): Promise<Id<'tripIssues'>> {
  const trip = await loadTripContext(ctx, tripId);
  if (trip.trip.proposal) throw new ConvexError('Create issues on the shared trip');
  const existing = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .take(MAX_ISSUES);
  if (existing.length >= MAX_ISSUES)
    throw new ConvexError(`Trips support up to ${MAX_ISSUES} issues`);
  const now = Date.now();
  return await insertWithShortId(ctx, 'tripIssues', {
    author: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    body: text(bodyInput, MAX_BODY_LENGTH, 'Issue description'),
    organizationId: trip.workspace.organizationId,
    status: 'open',
    title: text(titleInput, MAX_TITLE_LENGTH, 'Issue title'),
    tripId,
    updatedAt: now
  });
}

async function addComment(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  contentInput: string
): Promise<Id<'tripIssueComments'>> {
  const [{ issue, trip }, existing] = await Promise.all([
    issueWithTrip(ctx, issueId),
    ctx.db
      .query('tripIssueComments')
      .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
      .take(MAX_COMMENTS)
  ]);
  if (existing.length >= MAX_COMMENTS) {
    throw new ConvexError(`Trip issues support up to ${MAX_COMMENTS} comments`);
  }
  const now = Date.now();
  const commentId = await ctx.db.insert('tripIssueComments', {
    author: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    content: text(contentInput, MAX_COMMENT_LENGTH, 'Issue comment'),
    issueId,
    kind: 'comment',
    organizationId: trip.workspace.organizationId,
    tripId: issue.tripId,
    updatedAt: now
  });
  await ctx.db.patch('tripIssues', issueId, { updatedAt: now });
  return commentId;
}

async function appendSystemComment(
  ctx: MutationCtx,
  issue: Doc<'tripIssues'>,
  actor: { name: string; userId: string },
  content: string
): Promise<void> {
  const existing = await ctx.db
    .query('tripIssueComments')
    .withIndex('by_issueId', (query) => query.eq('issueId', issue._id))
    .take(MAX_COMMENTS);
  if (existing.length >= MAX_COMMENTS) return;
  const now = Date.now();
  await ctx.db.insert('tripIssueComments', {
    author: actor,
    content: text(content, MAX_COMMENT_LENGTH, 'Issue event'),
    issueId: issue._id,
    kind: 'system',
    organizationId: issue.organizationId,
    tripId: issue.tripId,
    updatedAt: now
  });
  await ctx.db.patch('tripIssues', issue._id, { updatedAt: now });
}

async function setStatus(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  status: 'closed' | 'open'
): Promise<null> {
  const { issue, trip } = await issueWithTrip(ctx, issueId);
  if (issue.author.userId !== trip.workspace.userId && trip.role !== 'organizer') {
    throw new ConvexError('Only the issue author or an organizer can change its status');
  }
  if (issue.status === status) return null;
  const now = Date.now();
  await ctx.db.patch('tripIssues', issueId, {
    closedAt: status === 'closed' ? now : undefined,
    status,
    updatedAt: now
  });
  return null;
}

async function createAssignedToIssueAgent(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  title: string,
  body: string
): Promise<Id<'tripIssues'>> {
  const issueId = await create(ctx, tripId, title, body);
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) throw new ConvexError('Trip issue not found');
  await ctx.db.patch('tripIssues', issueId, {
    assignee: issueAgentAssignee,
    updatedAt: Date.now()
  });
  const runId = await AgentRuns.queueIssueRun(ctx, {
    agentId: assistantAgents.issue.id,
    createdBy: issue.author,
    issueId,
    kickoff: 'queue',
    organizationId: issue.organizationId,
    title: issue.title,
    tripId
  });
  await ctx.scheduler.runAfter(0, internal.modules.assistant.standalone.execute.run, { runId });
  return issueId;
}

async function setAssignee(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  assignee: NonNullable<Assignee> | null
): Promise<Id<'agentRuns'> | null> {
  const { issue, trip } = await issueWithTrip(ctx, issueId);
  if (!isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can assign trip issues');
  }
  if (sameAssignee(issue.assignee, assignee)) {
    if (assignee?.kind === 'agent' && isIssueAssignableAgentId(assignee.agentId)) {
      return await AgentRuns.queueIssueRun(ctx, {
        agentId: assignee.agentId,
        createdBy: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
        issueId,
        kickoff: 'assign',
        organizationId: issue.organizationId,
        title: issue.title,
        tripId: issue.tripId
      });
    }
    return null;
  }
  const actor = { name: trip.workspace.viewerName, userId: trip.workspace.userId };
  const now = Date.now();
  await ctx.db.patch('tripIssues', issueId, {
    assignee: assignee ?? undefined,
    updatedAt: now
  });
  await appendSystemComment(
    ctx,
    issue,
    actor,
    assignmentMessage(actor.name, issue.assignee, assignee)
  );
  if (assignee?.kind === 'agent' && isIssueAssignableAgentId(assignee.agentId)) {
    return await AgentRuns.queueIssueRun(ctx, {
      agentId: assignee.agentId,
      createdBy: actor,
      issueId,
      kickoff: 'assign',
      organizationId: issue.organizationId,
      title: issue.title,
      tripId: issue.tripId
    });
  }
  await AgentRuns.abortActiveForIssue(ctx, issueId);
  return null;
}

async function setDueAt(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  dueAt: number | null
): Promise<null> {
  const { issue, trip } = await issueWithTrip(ctx, issueId);
  if (!isTripAdmin(trip) && issue.author.userId !== trip.workspace.userId) {
    throw new ConvexError('Only organizers or the author can set a decide-by date');
  }
  if (dueAt !== null && (!Number.isFinite(dueAt) || dueAt < 0)) {
    throw new ConvexError('Decide-by date is invalid');
  }
  await ctx.db.patch('tripIssues', issueId, {
    dueAt: dueAt ?? undefined,
    updatedAt: Date.now()
  });
  return null;
}

/** Planner issues on a trip: create, list, assign, comment, and status. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripIssues {
  static addComment = addComment;
  static create = create;
  static createAssignedToIssueAgent = createAssignedToIssueAgent;
  static get = get;
  static list = list;
  static listWorkspace = listWorkspace;
  static setAssignee = setAssignee;
  static setDueAt = setDueAt;
  static setStatus = setStatus;
}
