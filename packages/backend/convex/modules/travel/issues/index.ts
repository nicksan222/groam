import { assistantAgents, isIssueAssignableAgentId } from '@groam/ai/agents';
import type { PaginationOptions } from 'convex/server';
import { ConvexError, type Infer } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { insertWithShortId } from '#convex/modules/references/index';
import {
  bottomRank,
  compareByRank,
  issuesOf,
  laneIn,
  laneOf,
  MAX_ISSUES,
  MIN_RANK_GAP,
  RANK_STEP,
  rankOf
} from '#convex/modules/travel/issues/board';
import {
  appendComment,
  appendSystemComment,
  commentsOf,
  MAX_COMMENT_LENGTH,
  MAX_COMMENTS,
  MAX_SYSTEM_COMMENTS
} from '#convex/modules/travel/issues/comments';
import {
  checkedConditionMet,
  type RuleFacts,
  conditionLabel,
  conditionMet,
  isCheckedCondition,
  conditionRefusal,
  type IssueCondition,
  presentCondition
} from '#convex/modules/travel/issues/condition';
import { loadConditionFacts } from '#convex/modules/travel/issues/facts';
import {
  type IssueRule,
  emptyRuleFacts,
  normalizeRule,
  ruleLabel,
  ruleRefusal
} from '#convex/modules/travel/issues/rules/index';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';
import {
  isResolved,
  statusChangeMessage,
  type TripIssueStatus
} from '#convex/modules/travel/issues/status';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';
import {
  isTripAdmin,
  loadTripContext,
  type MutableTripCtx,
  type TripCtx,
  type TripRole
} from '#convex/modules/travel/trips/ctx';

const MAX_CONDITION_LENGTH = 200;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 5_000;

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
  return presentIdea(proposal);
}

function presentIdea(proposal: Doc<'tripProposals'> | null | undefined) {
  return proposal
    ? {
        id: proposal._id,
        status: proposal.status,
        title: proposal.title,
        workingTripId: proposal.workingTripId
      }
    : null;
}

/** A trip supports at most this many ideas (see the versions module), so one read covers them. */
const MAX_TRIP_IDEAS = 50;

/** The newest idea linked to each issue of a trip, from one read of the trip's ideas. */
async function latestIdeaByIssue(ctx: QueryCtx, tripId: Id<'trips'>) {
  const proposals = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', tripId))
    .take(MAX_TRIP_IDEAS + 1);
  if (proposals.length > MAX_TRIP_IDEAS) {
    throw new ConvexError(`Trips support up to ${MAX_TRIP_IDEAS} ideas`);
  }
  const latest = new Map<Id<'tripIssues'>, Doc<'tripProposals'>>();
  for (const proposal of proposals) {
    const current = proposal.issueId ? latest.get(proposal.issueId) : undefined;
    if (proposal.issueId && (!current || proposal._creationTime > current._creationTime)) {
      latest.set(proposal.issueId, proposal);
    }
  }
  return latest;
}

const issueAgentAssignee = {
  agentId: assistantAgents.issue.id,
  kind: 'agent' as const,
  name: assistantAgents.issue.label
};

function presentAssignee(
  assignee: NonNullable<Assignee>
): Infer<typeof TripIssueValidators.assignee> {
  return assignee.kind === 'agent' ? issueAgentAssignee : assignee;
}

/** Identifies who holds an issue, treating every stored agent id as the Issue agent. */
function assigneeKey(assignee: Assignee | undefined | null): string | null {
  if (!assignee) return null;
  const presented = presentAssignee(assignee);
  return presented.kind === 'agent' ? `agent:${presented.agentId}` : `user:${presented.userId}`;
}

function assignmentMessage(
  actorName: string,
  previous: Assignee | undefined,
  next: NonNullable<Assignee> | null
): string {
  if (next === null) {
    return previous
      ? `${actorName} unassigned ${presentAssignee(previous).name}`
      : `${actorName} unassigned this`;
  }
  return `${actorName} assigned this to ${presentAssignee(next).name}`;
}

type Viewer = { archived: boolean; role: TripRole; userId: string };

function viewerOf(trip: TripCtx): Viewer {
  return {
    archived: trip.trip.archive !== undefined,
    role: trip.role,
    userId: trip.workspace.userId
  };
}

/** Only the author or an organizer may change status or board position; archived is read-only. */
function canManageIssue(issue: Doc<'tripIssues'>, viewer: Viewer): boolean {
  return !viewer.archived && (issue.author.userId === viewer.userId || viewer.role === 'organizer');
}

/** Only organizers assign issues (as `setAssignee` enforces); archived is read-only. */
function canAssignIssue(viewer: Viewer): boolean {
  return !viewer.archived && viewer.role === 'organizer';
}

function presentListItem(
  issue: Doc<'tripIssues'>,
  viewer: Viewer,
  facts: RuleFacts,
  idea: ReturnType<typeof presentIdea>
) {
  return {
    assignee: issue.assignee ? presentAssignee(issue.assignee) : null,
    author: issue.author,
    body: issue.body,
    canAssign: canAssignIssue(viewer),
    canManage: canManageIssue(issue, viewer),
    closedAt: issue.closedAt ?? null,
    condition: presentCondition(issue.condition, facts),
    dueAt: issue.dueAt ?? null,
    id: issue._id,
    ...(issue.shortId ? { shortId: issue.shortId } : {}),
    idea,
    labels: issue.labels ?? [],
    rank: rankOf(issue),
    status: issue.status,
    title: issue.title,
    updatedAt: issue.updatedAt
  };
}

async function list(ctx: QueryCtx, tripId: Id<'trips'>) {
  const trip = await loadTripContext(ctx, tripId);
  const viewer = viewerOf(trip);
  const issues = await issuesOf(ctx, tripId);
  const [facts, ideas] = await Promise.all([
    loadConditionFacts(trip, issues),
    latestIdeaByIssue(ctx, tripId)
  ]);
  // Board order (rank, then creation time) lets clients render lanes as they come.
  return issues
    .toSorted(compareByRank)
    .map((issue) => presentListItem(issue, viewer, facts, presentIdea(ideas.get(issue._id))));
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

  const views = new Map<Id<'trips'>, ReturnType<typeof loadTripView>>();
  const tripViewOf = (tripId: Id<'trips'>) => {
    const cached = views.get(tripId);
    if (cached) return cached;
    const loading = loadTripView(
      ctx,
      workspace,
      tripId,
      result.page.filter((issue) => issue.tripId === tripId)
    );
    views.set(tripId, loading);
    return loading;
  };
  const page = await Promise.all(
    result.page.map(async (issue) => {
      const [{ facts, trip, viewer }, idea] = await Promise.all([
        tripViewOf(issue.tripId),
        linkedProposal(ctx, issue._id)
      ]);
      return {
        ...presentListItem(issue, viewer, facts, idea),
        tripId: issue.tripId,
        tripName: trip.trip.name
      };
    })
  );
  return { ...result, page };
}

/** What presenting one trip's issues needs: the trip, the viewer's standing, and its facts. */
async function loadTripView(
  ctx: QueryCtx,
  workspace: Workspace,
  tripId: Id<'trips'>,
  issues: Array<Doc<'tripIssues'>>
) {
  const trip = await loadTripContext(ctx, tripId, workspace);
  return { facts: await loadConditionFacts(trip, issues), trip, viewer: viewerOf(trip) };
}

async function get(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) return null;
  const workspace = await requireWorkspace(ctx);
  if (issue.organizationId !== workspace.organizationId) return null;
  const loaded = await loadTripContext(ctx, issue.tripId, workspace);
  const [comments, idea, facts] = await Promise.all([
    commentsOf(ctx, issueId),
    linkedProposal(ctx, issueId),
    loadConditionFacts(loaded, [issue])
  ]);
  if (comments.length > MAX_COMMENTS + MAX_SYSTEM_COMMENTS) {
    throw new ConvexError(
      `Trip issues support up to ${MAX_COMMENTS + MAX_SYSTEM_COMMENTS} comments`
    );
  }
  return {
    ...presentListItem(issue, viewerOf(loaded), facts, idea),
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

type NewIssue = {
  body: string;
  boardRank: number;
  condition?: IssueCondition;
  labels?: Array<Infer<typeof TripIssueValidators.label>>;
  title: string;
};

/** The single insertion path for hand-made and starter issues. */
async function insertIssue(trip: MutableTripCtx, input: NewIssue): Promise<Id<'tripIssues'>> {
  return await insertWithShortId(trip, 'tripIssues', {
    author: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    boardRank: input.boardRank,
    body: text(input.body, MAX_BODY_LENGTH, 'Issue description'),
    ...(input.condition ? { condition: input.condition } : {}),
    ...(input.labels ? { labels: input.labels } : {}),
    organizationId: trip.workspace.organizationId,
    status: 'open',
    title: text(input.title, MAX_TITLE_LENGTH, 'Issue title'),
    tripId: trip.trip._id,
    updatedAt: Date.now()
  });
}

function assertSharedTrip(trip: MutableTripCtx): void {
  if (trip.trip.proposal) throw new ConvexError('Create issues on the shared trip');
}

type CreateInput = { body: string; doneWhen?: string; rule?: IssueRule; title: string };

/** A person's "done when": a composed rule the system checks, else free text, else none. */
function personCondition(input: { doneWhen?: string; rule?: IssueRule }) {
  if (input.rule !== undefined) {
    if (input.doneWhen !== undefined) {
      throw new ConvexError('Give a done-when rule or a description, not both');
    }
    return { kind: 'rule', rule: normalizeRule(input.rule) } satisfies IssueCondition;
  }
  if (input.doneWhen === undefined) return undefined;
  return {
    kind: 'manual',
    text: text(input.doneWhen, MAX_CONDITION_LENGTH, 'Done-when condition')
  } satisfies IssueCondition;
}

/**
 * Creates an issue at the bottom of the open lane with the person's condition. A rule the trip
 * already meets closes the issue straight away, like any later change that meets it.
 */
async function create(trip: MutableTripCtx, input: CreateInput): Promise<Id<'tripIssues'>> {
  assertSharedTrip(trip);
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  // One read serves both the capacity check and the append position.
  const existing = await issuesOf(trip, trip.trip._id);
  if (existing.length >= MAX_ISSUES) {
    throw new ConvexError(`Trips support up to ${MAX_ISSUES} issues`);
  }
  const condition = personCondition(input);
  const issueId = await insertIssue(trip, {
    body: input.body,
    boardRank: bottomRank(laneIn(existing, 'open')),
    condition,
    title: input.title
  });
  if (condition?.kind === 'rule') await syncTripConditions(trip);
  return issueId;
}

/**
 * Inserts the starters one after another: each insert reserves the next short id, and creation
 * order is display order, so the inserts cannot run side by side.
 */
async function insertStartersInOrder(
  trip: MutableTripCtx,
  queue: ReadonlyArray<[number, (typeof STARTER_ISSUES)[number]]>
): Promise<void> {
  const [next, ...rest] = queue;
  if (!next) return;
  const [index, starter] = next;
  await insertIssue(trip, {
    body: starter.body(trip.trip),
    boardRank: (index + 1) * RANK_STEP,
    condition: { check: starter.check, kind: 'auto' },
    labels: starter.mandatory ? ['mandatory'] : [],
    title: starter.title
  });
  await insertStartersInOrder(trip, rest);
}

/** Opens the starter decisions on a newly created shared trip. */
async function createStarterIssues(trip: MutableTripCtx): Promise<void> {
  assertSharedTrip(trip);
  // A new trip has no lists yet, so the evaluator that closes issues also decides what to skip.
  const facts = emptyRuleFacts(trip.trip);
  const starters = STARTER_ISSUES.filter((starter) => !conditionMet(starter.check, facts));
  // Inserted last-first so lists that show the newest first also read in display order.
  await insertStartersInOrder(trip, [...starters.entries()].toReversed());
}

async function addComment(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  contentInput: string
): Promise<Id<'tripIssueComments'>> {
  const { trip } = await issueWithTrip(ctx, issueId);
  const commentId = await appendComment(ctx, issueId, 'comment', {
    author: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    content: text(contentInput, MAX_COMMENT_LENGTH, 'Issue comment')
  });
  if (commentId === null) {
    throw new ConvexError(`Trip issues support up to ${MAX_COMMENTS} comments`);
  }
  await ctx.db.patch('tripIssues', issueId, { updatedAt: Date.now() });
  return commentId;
}

/** Where a dropped card goes: the card directly above and/or directly below it in the lane. */
type Placement = { above?: Id<'tripIssues'>; below?: Id<'tripIssues'> };

/**
 * Where to put a card in `lane` (the target lane without it): directly below `above`, else
 * directly above `below`, else at the bottom. `above` wins when both are given, so a slightly
 * stale drop still lands next to a card the user saw.
 */
function insertionIndex(lane: Array<Doc<'tripIssues'>>, placement: Placement): number {
  const indexOf = (id: Id<'tripIssues'> | undefined) =>
    id === undefined ? -1 : lane.findIndex((candidate) => candidate._id === id);
  const above = indexOf(placement.above);
  if (above !== -1) return above + 1;
  const below = indexOf(placement.below);
  return below === -1 ? lane.length : below;
}

/** Neighbors must be issues of the same trip; ones that merely changed lanes are tolerated. */
async function assertNeighborsOnTrip(
  ctx: MutationCtx,
  issue: Doc<'tripIssues'>,
  placement: Placement
): Promise<void> {
  const ids = [placement.above, placement.below].filter((id) => id !== undefined);
  if (ids.includes(issue._id)) throw new ConvexError('An issue cannot be placed next to itself');
  const neighbors = await Promise.all(ids.map((id) => ctx.db.get('tripIssues', id)));
  if (neighbors.some((neighbor) => neighbor?.tripId !== issue.tripId)) {
    throw new ConvexError('Neighbor issue is not on this trip');
  }
}

/** Rank for a card dropped at `index`; renumbers the lane first if the gap is too small. */
async function rankAt(
  ctx: MutationCtx,
  issue: Doc<'tripIssues'>,
  lane: Array<Doc<'tripIssues'>>,
  index: number
): Promise<number> {
  const above = lane[index - 1];
  const below = lane[index];
  if (!above) return below ? rankOf(below) - RANK_STEP : RANK_STEP;
  if (!below) return rankOf(above) + RANK_STEP;
  const gap = rankOf(below) - rankOf(above);
  if (gap >= MIN_RANK_GAP) return rankOf(above) + gap / 2;
  // Neighbors are too close (or tied): renumber the lane with the dropped card in place.
  const ordered = [...lane.slice(0, index), issue, ...lane.slice(index)];
  await Promise.all(
    ordered.flatMap((entry, position) =>
      entry._id === issue._id
        ? []
        : [ctx.db.patch('tripIssues', entry._id, { boardRank: (position + 1) * RANK_STEP })]
    )
  );
  return (index + 1) * RANK_STEP;
}

/**
 * A checked-condition issue is closed exactly when its condition holds, so a person can neither
 * resolve it while unmet nor make it active again while met. A person's own rule can always be
 * marked won't do, which the system then leaves alone; a starter check cannot, since every trip
 * needs it settled. Reordering inside a lane is always fine.
 */
async function assertCheckedConditionAllows(
  trip: TripCtx,
  issue: Doc<'tripIssues'>,
  status: TripIssueStatus
): Promise<void> {
  const { condition } = issue;
  if (!isCheckedCondition(condition) || issue.status === status) return;
  if (condition.kind === 'rule' && status === 'wont_do') return;
  const met = checkedConditionMet(condition, await loadConditionFacts(trip, [issue]));
  if (isResolved(status) === met) return;
  throw new ConvexError(
    condition.kind === 'auto'
      ? conditionRefusal(condition.check, met)
      : ruleRefusal(ruleLabel(condition.rule), met)
  );
}

/** Moving between closed and wont_do keeps the moment the issue was first resolved. */
function nextClosedAt(
  from: TripIssueStatus,
  to: TripIssueStatus,
  current: number | undefined,
  now: number
): number | undefined {
  if (!isResolved(to)) return undefined;
  return isResolved(from) ? current : now;
}

/**
 * The one write path for an issue's lifecycle and board position. The server computes the rank
 * from neighbors, so clients never send one. A status change without placement appends to the
 * bottom of the target lane. Only an actual status change leaves a system comment and bumps
 * `updatedAt`, so reordering within a lane stays quiet.
 */
async function move(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  status: TripIssueStatus,
  placement?: Placement
): Promise<null> {
  const { issue, trip } = await issueWithTrip(ctx, issueId);
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (!canManageIssue(issue, viewerOf(trip))) {
    throw new ConvexError('Only the issue author or an organizer can change its status');
  }
  if (issue.status === status && !placement) return null;
  const target = placement ?? {};
  await assertNeighborsOnTrip(ctx, issue, target);
  await assertCheckedConditionAllows(trip, issue, status);
  const lane = (await laneOf(ctx, issue.tripId, status)).filter((entry) => entry._id !== issueId);
  const boardRank = await rankAt(ctx, issue, lane, insertionIndex(lane, target));
  if (issue.status === status) {
    await ctx.db.patch('tripIssues', issueId, { boardRank });
    return null;
  }
  const now = Date.now();
  await ctx.db.patch('tripIssues', issueId, {
    boardRank,
    closedAt: nextClosedAt(issue.status, status, issue.closedAt, now),
    status,
    updatedAt: now
  });
  const actor = { name: trip.workspace.viewerName, userId: trip.workspace.userId };
  await appendSystemComment(ctx, issueId, actor, `${actor.name} ${statusChangeMessage(status)}`);
  return null;
}

/** Closes an unresolved issue as done after its idea merged, at the bottom of the closed lane. */
async function closeAfterMerge(
  ctx: MutationCtx,
  issue: Doc<'tripIssues'>,
  merge: { actor: { name: string; userId: string }; ideaTitle: string; timestamp: number }
): Promise<void> {
  const { actor, ideaTitle, timestamp } = merge;
  // A checked condition decides for itself whether the merge settled the issue.
  if (isResolved(issue.status) || isCheckedCondition(issue.condition)) return;
  const lane = await laneOf(ctx, issue.tripId, 'closed');
  await ctx.db.patch('tripIssues', issue._id, {
    boardRank: bottomRank(lane),
    closedAt: timestamp,
    status: 'closed',
    updatedAt: timestamp
  });
  await appendSystemComment(
    ctx,
    issue._id,
    actor,
    `${actor.name} closed this by applying ${ideaTitle}`
  );
}

async function createAssignedToIssueAgent(
  ctx: MutableTripCtx,
  title: string,
  body: string
): Promise<Id<'tripIssues'>> {
  const issueId = await create(ctx, { body, title });
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
    tripId: ctx.trip._id
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
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (!isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can assign trip issues');
  }
  const actor = { name: trip.workspace.viewerName, userId: trip.workspace.userId };
  const agentId =
    assignee?.kind === 'agent' && isIssueAssignableAgentId(assignee.agentId)
      ? assignee.agentId
      : null;
  const queueRun = () =>
    agentId === null
      ? Promise.resolve(null)
      : AgentRuns.queueIssueRun(ctx, {
          agentId,
          createdBy: actor,
          issueId,
          kickoff: 'assign',
          organizationId: issue.organizationId,
          title: issue.title,
          tripId: issue.tripId
        });
  if (assigneeKey(issue.assignee) === assigneeKey(assignee)) return await queueRun();
  await ctx.db.patch('tripIssues', issueId, {
    assignee: assignee ?? undefined,
    updatedAt: Date.now()
  });
  await appendSystemComment(
    ctx,
    issueId,
    actor,
    assignmentMessage(actor.name, issue.assignee, assignee)
  );
  if (agentId !== null) return await queueRun();
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

/**
 * Sets, replaces, or clears (neither given) a person's "done when". Starter decisions keep their
 * own check. A new rule is checked at once, so the issue closes or reopens to match the trip;
 * dropping a rule leaves the status where it is.
 */
async function setCondition(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  input: { doneWhen?: string; rule?: IssueRule }
): Promise<null> {
  const { issue, trip } = await issueWithTrip(ctx, issueId);
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (!isTripAdmin(trip) && issue.author.userId !== trip.workspace.userId) {
    throw new ConvexError('Only organizers or the author can change when an issue is done');
  }
  if (issue.condition?.kind === 'auto') {
    throw new ConvexError('Starter decisions are checked automatically and cannot be changed');
  }
  const condition = personCondition(input);
  await ctx.db.patch('tripIssues', issueId, { condition, updatedAt: Date.now() });
  const actor = { name: trip.workspace.viewerName, userId: trip.workspace.userId };
  await appendSystemComment(
    ctx,
    issueId,
    actor,
    condition
      ? `${actor.name} set done when: ${conditionLabel(condition)}`
      : `${actor.name} removed the done-when condition`
  );
  if (condition?.kind === 'rule') await syncTripConditions(trip);
  return null;
}

/** Planner issues on a trip: create, list, assign, comment, and status. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripIssues {
  static addComment = addComment;
  static create = create;
  static closeAfterMerge = closeAfterMerge;
  static createAssignedToIssueAgent = createAssignedToIssueAgent;
  static createStarterIssues = createStarterIssues;
  static get = get;
  static list = list;
  static listWorkspace = listWorkspace;
  static move = move;
  static setAssignee = setAssignee;
  static setCondition = setCondition;
  static setDueAt = setDueAt;
}
