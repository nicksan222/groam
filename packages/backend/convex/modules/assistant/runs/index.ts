import {
  assistantAgentList,
  assistantAgents,
  isAssistantAgentId,
  isChatAgent,
  isIssueAssignableAgentId
} from '@groam/ai/agents';
import {
  countActiveAgentRuns,
  presentLatestAgentRun,
  rosterStatusFromRuns
} from '@groam/ai/backend/runs/roster';
import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import type {
  AgentRosterItem,
  AgentRunEventView,
  AgentRunView
} from '#convex/modules/assistant/runs/schema';
import type { AssistantScreen } from '#convex/modules/assistant/validators/index';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { insertWithShortId } from '#convex/modules/references/index';
import { assertTripWritable, issueWithTrip } from '#convex/modules/travel/issues/guard';
import { isResolved } from '#convex/modules/travel/issues/status';
import { isTripAdmin, loadTripContext } from '#convex/modules/travel/trips/ctx';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const MAX_ASSIGNED_ISSUES = 200;
const MAX_EVENT_PAGE = 50;
const MAX_RUN_PAGE = 25;
const ROSTER_RUNS_PER_AGENT = 20;
const ROSTER_CANDIDATES_PER_AGENT = 200;

function requireRunPageSize(paginationOpts: PaginationOptions) {
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > MAX_RUN_PAGE
  ) {
    throw new ConvexError(`run page size must be between 1 and ${MAX_RUN_PAGE}`);
  }
}

type RunWriter = MutationCtx;
type RunReader = MutationCtx | QueryCtx;

const emptyRelated = {
  chatTitle: null,
  ideaTitle: null,
  issueTitle: null,
  tripName: null
} satisfies AgentRunView['related'];

function presentRun(
  run: Doc<'agentRuns'>,
  related: AgentRunView['related'] = emptyRelated
): AgentRunView {
  return {
    agentId: run.agentId,
    completedAt: run.completedAt ?? null,
    createdBy: run.createdBy,
    discussionId: run.discussionId ?? null,
    error: run.error ?? null,
    headline: run.headline ?? null,
    id: run._id,
    shortId: run.shortId,
    issueId: run.issueId ?? null,
    kickoff: run.kickoff,
    proposalId: run.proposalId ?? null,
    related,
    report: run.report ?? null,
    ...(run.researchTask ? { researchTask: run.researchTask } : {}),
    startedAt: run.startedAt ?? null,
    status: run.status,
    surface: run.surface,
    threadId: run.threadId ?? null,
    title: run.title,
    tripId: run.tripId ?? null,
    updatedAt: run.updatedAt
  };
}

async function relatedForRun(
  ctx: QueryCtx,
  run: Doc<'agentRuns'>,
  organizationId: string
): Promise<AgentRunView['related']> {
  const [issue, trip, proposal, discussion] = await Promise.all([
    run.issueId ? ctx.db.get('tripIssues', run.issueId) : null,
    run.tripId ? ctx.db.get('trips', run.tripId) : null,
    run.proposalId ? ctx.db.get('tripProposals', run.proposalId) : null,
    run.discussionId ? ctx.db.get('discussions', run.discussionId) : null
  ]);
  return {
    chatTitle: discussion?.organizationId === organizationId ? discussion.title : null,
    ideaTitle: proposal?.organizationId === organizationId ? proposal.branchName : null,
    issueTitle: issue?.organizationId === organizationId ? issue.title : null,
    tripName: trip?.organizationId === organizationId ? trip.name : null
  };
}

function presentLatestRun(run: Doc<'agentRuns'>): NonNullable<AgentRosterItem['latestRun']> {
  return presentLatestAgentRun(presentRun(run));
}

function presentEvent(event: Doc<'agentRunEvents'>): AgentRunEventView {
  return {
    at: event.at,
    detail: event.detail ?? null,
    id: event._id,
    input: event.input ?? null,
    kind: event.kind,
    label: event.label,
    ok: event.ok ?? null,
    output: event.output ?? null,
    seq: event.seq,
    toolName: event.toolName ?? null
  };
}

async function nextSeq(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<number> {
  const last = await ctx.db
    .query('agentRunEvents')
    .withIndex('by_runId_and_seq', (query) => query.eq('runId', runId))
    .order('desc')
    .first();
  return (last?.seq ?? 0) + 1;
}

async function linkedRunTrip(ctx: RunReader, run: Doc<'agentRuns'>) {
  if (run.tripId) return run.tripId;
  if (run.issueId) return (await ctx.db.get('tripIssues', run.issueId))?.tripId ?? null;
  if (run.proposalId)
    return (await ctx.db.get('tripProposals', run.proposalId))?.sourceTripId ?? null;
  if (run.discussionId) {
    const discussion = await ctx.db.get('discussions', run.discussionId);
    return discussion && 'tripId' in discussion ? (discussion.tripId ?? null) : null;
  }
  return null;
}

/** Every linked trip requires participation; discussion logs also require their audience grant. */
async function canViewRun(
  ctx: RunReader,
  run: Doc<'agentRuns'>,
  workspace: Workspace,
  preview = false
): Promise<boolean> {
  if (run.organizationId !== workspace.organizationId) return false;
  const tripId = await linkedRunTrip(ctx, run);
  if ((run.tripId || run.issueId || run.proposalId || run.researchTask) && !tripId) return false;
  if (tripId && !(await findVisibleTrip(ctx, tripId, workspace, { allowUnpaid: preview })))
    return false;
  if (!run.discussionId) return !run.researchTask || run.createdBy.userId === workspace.userId;
  try {
    if (preview) await DiscussionAccess.assertPreviewAudience(ctx, run.discussionId, workspace);
    else await DiscussionAccess.forWorkspace(ctx, run.discussionId, workspace);
    return true;
  } catch {
    return false;
  }
}

/** Only navigation identifiers; content remains behind the full participation gate. */
async function previewReference(ctx: RunReader, runId: Id<'agentRuns'>, workspace: Workspace) {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || !(await canViewRun(ctx, run, workspace, true))) return null;
  const tripId = await linkedRunTrip(ctx, run);
  if (!tripId) return { id: run._id, shortId: run.shortId };
  const trip = await findVisibleTrip(ctx, tripId, workspace, { allowUnpaid: true });
  if (!trip) return null;
  const sourceId = trip.proposal?.sourceTripId ?? trip._id;
  if (!(await findVisibleTrip(ctx, sourceId, workspace, { allowUnpaid: true }))) return null;
  return { id: run._id, shortId: run.shortId, tripId: sourceId };
}

/** Drops runs the viewer may not see; one bounded index lookup per discussion run. */
async function visibleRuns(
  ctx: RunReader,
  runs: Array<Doc<'agentRuns'>>,
  workspace: Workspace
): Promise<Array<Doc<'agentRuns'>>> {
  const allowed = await Promise.all(runs.map((run) => canViewRun(ctx, run, workspace)));
  return runs.filter((_, index) => allowed[index]);
}

/** A run outside the org or in a discussion the viewer is not in reads as missing. */
async function requireOrgRun(ctx: RunReader, runId: Id<'agentRuns'>, workspace: Workspace) {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || !(await canViewRun(ctx, run, workspace))) {
    throw new ConvexError('Agent run not found');
  }
  return run;
}

/** Queued, running, or suspended on a wait: the run still owns its issue or proposal. */
function isActiveRunStatus(status: Doc<'agentRuns'>['status']): boolean {
  return status === 'queued' || status === 'running' || status === 'waiting';
}

async function activeIssueRun(ctx: RunReader, issueId: Id<'tripIssues'>) {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_issueId_and_updatedAt', (query) => query.eq('issueId', issueId))
    .order('desc')
    .take(20);
  return runs.find((run) => isActiveRunStatus(run.status)) ?? null;
}

async function activeDiscussionRun(ctx: RunReader, discussionId: Id<'discussions'>) {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId))
    .order('desc')
    .take(20);
  return runs.find((run) => run.status === 'queued' || run.status === 'running') ?? null;
}

async function activeProposalRun(
  ctx: RunReader,
  proposalId: Id<'tripProposals'>,
  organizationId: string
) {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_proposalId_and_updatedAt', (query) => query.eq('proposalId', proposalId))
    .order('desc')
    .take(20);
  return (
    runs.find((run) => run.organizationId === organizationId && isActiveRunStatus(run.status)) ??
    null
  );
}

async function queueIssueRun(
  ctx: RunWriter,
  args: {
    actorTokenIdentifier?: string;
    agentId: Doc<'agentRuns'>['agentId'];
    createdBy: { name: string; userId: string };
    issueId: Id<'tripIssues'>;
    kickoff: 'assign' | 'queue';
    organizationId: string;
    title: string;
    tripId: Id<'trips'>;
  }
): Promise<Id<'agentRuns'>> {
  if (!isIssueAssignableAgentId(args.agentId)) {
    throw new ConvexError('Only the Issue agent can run on an assigned issue');
  }
  const existing = await activeIssueRun(ctx, args.issueId);
  if (existing) return existing._id;
  const agent = assistantAgents[args.agentId];
  const now = Date.now();
  return await insertWithShortId(ctx, 'agentRuns', {
    ...(args.actorTokenIdentifier ? { actorTokenIdentifier: args.actorTokenIdentifier } : {}),
    agentId: agent.id,
    createdBy: args.createdBy,
    issueId: args.issueId,
    kickoff: args.kickoff,
    organizationId: args.organizationId,
    status: 'queued',
    surface: agent.surface,
    title: args.title,
    tripId: args.tripId,
    updatedAt: now
  });
}

async function oldestQueuedDiscussionRun(ctx: RunReader, discussionId: Id<'discussions'>) {
  return await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
      query.eq('discussionId', discussionId).eq('status', 'queued')
    )
    .order('asc')
    .first();
}

async function queueDiscussionTurn(
  ctx: RunWriter,
  args: {
    agentId: Doc<'agentRuns'>['agentId'];
    createdBy: { name: string; userId: string };
    discussionId: Id<'discussions'>;
    organizationId: string;
    threadId: string;
    title: string;
  }
): Promise<Id<'agentRuns'>> {
  const agent = assistantAgents[args.agentId];
  if (!isChatAgent(agent)) throw new ConvexError('Only chat agents can run in discussions');
  const now = Date.now();
  return await insertWithShortId(ctx, 'agentRuns', {
    agentId: agent.id,
    createdBy: args.createdBy,
    discussionId: args.discussionId,
    kickoff: 'assign',
    organizationId: args.organizationId,
    status: 'queued',
    surface: agent.surface,
    threadId: args.threadId,
    title: args.title,
    updatedAt: now
  });
}

async function claimDiscussionTurn(
  ctx: RunWriter,
  args: {
    actorTokenIdentifier: string;
    agentId: Doc<'agentRuns'>['agentId'];
    createdBy: { name: string; userId: string };
    discussionId: Id<'discussions'>;
    discussionUpdatedAt: number;
    organizationId: string;
    promptMessageId: string;
    screen: AssistantScreen;
    threadId: string;
    title: string;
  }
): Promise<Id<'agentRuns'>> {
  const agent = assistantAgents[args.agentId];
  if (!isChatAgent(agent)) throw new ConvexError('Only chat agents can run in discussions');
  // A stale re-claim replaces the earlier run for this prompt. Stop it and its workflow after
  // the new run exists, so the cancelled run's completion sees it was superseded.
  const [runId, running] = await Promise.all([
    startDiscussionTurn(ctx, agent, args),
    ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
        query.eq('discussionId', args.discussionId).eq('status', 'running')
      )
      .order('desc')
      .take(20)
  ]);
  await Promise.all(
    running
      .filter((run) => run._id !== runId && run.promptMessageId === args.promptMessageId)
      .map((run) => abortActiveRun(ctx, run))
  );
  return runId;
}

/** The oldest queued turn becomes this claim's run; with none queued, a new running run. */
async function startDiscussionTurn(
  ctx: RunWriter,
  agent: (typeof assistantAgents)[keyof typeof assistantAgents],
  args: Parameters<typeof claimDiscussionTurn>[1]
): Promise<Id<'agentRuns'>> {
  const queued = await oldestQueuedDiscussionRun(ctx, args.discussionId);
  const now = Date.now();
  const turn = {
    actorTokenIdentifier: args.actorTokenIdentifier,
    discussionUpdatedAt: args.discussionUpdatedAt,
    promptMessageId: args.promptMessageId,
    screen: args.screen
  };
  if (queued) {
    await ctx.db.patch('agentRuns', queued._id, {
      ...turn,
      startedAt: queued.startedAt ?? now,
      status: 'running',
      threadId: args.threadId,
      updatedAt: now
    });
    return queued._id;
  }
  return await insertWithShortId(ctx, 'agentRuns', {
    ...turn,
    agentId: agent.id,
    createdBy: args.createdBy,
    discussionId: args.discussionId,
    kickoff: 'assign',
    organizationId: args.organizationId,
    startedAt: now,
    status: 'running',
    surface: agent.surface,
    threadId: args.threadId,
    title: args.title,
    updatedAt: now
  });
}

async function queueReviewRun(
  ctx: RunWriter,
  args: {
    actorTokenIdentifier?: string;
    createdBy: { name: string; userId: string };
    organizationId: string;
    proposalId: Id<'tripProposals'>;
    title: string;
    tripId: Id<'trips'>;
  }
): Promise<Id<'agentRuns'>> {
  const existing = await activeProposalRun(ctx, args.proposalId, args.organizationId);
  if (existing) return existing._id;
  const agent = assistantAgents.reviewer;
  const now = Date.now();
  return await insertWithShortId(ctx, 'agentRuns', {
    ...(args.actorTokenIdentifier ? { actorTokenIdentifier: args.actorTokenIdentifier } : {}),
    agentId: agent.id,
    createdBy: args.createdBy,
    kickoff: 'assign',
    organizationId: args.organizationId,
    proposalId: args.proposalId,
    status: 'queued',
    surface: agent.surface,
    title: args.title,
    tripId: args.tripId,
    updatedAt: now
  });
}

/**
 * Starts a workflow turn: `queued` (or a chat turn the respond mutation already marked
 * `running`) becomes `running`. Turns never retry, so a `running` run is never claimed twice by
 * the same workflow. Terminal runs return null.
 */
async function claimTurn(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<Doc<'agentRuns'> | null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run) throw new ConvexError('Agent run not found');
  if (run.status === 'complete' || run.status === 'failed' || run.status === 'aborted') return null;
  const now = Date.now();
  const resumed = run.status === 'waiting';
  // A resumed chat turn posts its reply later; guard it against messages sent meanwhile.
  const discussion =
    resumed && run.discussionId ? await ctx.db.get('discussions', run.discussionId) : null;
  const patch = {
    headline: 'Working…',
    startedAt: run.startedAt ?? now,
    status: 'running' as const,
    turns: (run.turns ?? 0) + 1,
    updatedAt: now,
    // A resumed run's wait is resolved; the next `waitFor` sets a new one.
    ...(resumed ? { activeWaitId: undefined } : {}),
    ...(discussion ? { discussionUpdatedAt: discussion.updatedAt } : {})
  };
  await ctx.db.patch('agentRuns', runId, patch);
  return { ...run, ...patch };
}

async function attachProposal(
  ctx: RunWriter,
  runId: Id<'agentRuns'>,
  proposalId: Id<'tripProposals'>
): Promise<null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run) throw new ConvexError('Agent run not found');
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (!proposal || proposal.organizationId !== run.organizationId) {
    throw new ConvexError('Idea not found');
  }
  if (run.proposalId === proposalId) return null;
  await ctx.db.patch('agentRuns', runId, { proposalId, updatedAt: Date.now() });
  return null;
}

async function finish(
  ctx: RunWriter,
  args: {
    error?: string;
    report?: string;
    runId: Id<'agentRuns'>;
    status: 'complete' | 'failed' | 'aborted';
  }
): Promise<null> {
  const run = await ctx.db.get('agentRuns', args.runId);
  if (!run) throw new ConvexError('Agent run not found');
  if (run.status === 'complete' || run.status === 'failed' || run.status === 'aborted') {
    return null;
  }
  const now = Date.now();
  await ctx.db.patch('agentRuns', args.runId, {
    completedAt: now,
    status: args.status,
    updatedAt: now,
    ...(args.status === 'aborted' && !args.error ? { headline: 'Stopped' } : {}),
    ...(args.error ? { error: args.error, headline: args.error } : {}),
    ...(args.report ? { report: args.report, headline: args.report.slice(0, 160) } : {})
  });
  return null;
}

async function abortActiveRun(ctx: RunWriter, run: Doc<'agentRuns'> | null): Promise<null> {
  if (!run) return null;
  if (!isActiveRunStatus(run.status)) return null;
  const now = Date.now();
  await ctx.db.patch('agentRuns', run._id, {
    completedAt: now,
    headline: 'Stopped',
    status: 'aborted',
    updatedAt: now
  });
  await AgentEngine.cancel(ctx, run);
  return null;
}

const STALE_RUN_MS = 15 * 60 * 1000;
const STALE_QUEUED_MS = 10 * 60 * 1000;
const STALE_RUN_BATCH = 100;
const STALE_RUN_ERROR = 'The run stopped responding. Try again.';

/**
 * Safety net for runs no workflow owns: pre-workflow runs, inline idea reviews that died with
 * their action, and chat turns queued by `send` that no client ever responded to. Workflow runs
 * report through `onComplete` and are never swept.
 */
async function failStaleRuns(ctx: RunWriter, now: number = Date.now()): Promise<number> {
  const unowned = (status: 'queued' | 'running', idleMs: number) =>
    ctx.db
      .query('agentRuns')
      .withIndex('by_status_and_workflowId_and_updatedAt', (query) =>
        query
          .eq('status', status)
          .eq('workflowId', undefined)
          .lt('updatedAt', now - idleMs)
      )
      .take(STALE_RUN_BATCH);
  const [running, queued] = await Promise.all([
    unowned('running', STALE_RUN_MS),
    unowned('queued', STALE_QUEUED_MS)
  ]);
  const stale = [...running, ...queued];
  await Promise.all(
    stale.map((run) =>
      ctx.db.patch('agentRuns', run._id, {
        completedAt: now,
        error: STALE_RUN_ERROR,
        headline: STALE_RUN_ERROR,
        status: 'failed',
        updatedAt: now
      })
    )
  );
  return stale.length;
}

async function abortActiveForIssue(ctx: RunWriter, issueId: Id<'tripIssues'>): Promise<null> {
  return await abortActiveRun(ctx, await activeIssueRun(ctx, issueId));
}

const ACTIVE_RUN_STATUSES = ['queued', 'running', 'waiting'] as const;

/** Before a discussion is deleted: stop every run in it, including ones suspended on a wait. */
async function abortAllForDiscussion(
  ctx: RunWriter,
  discussionId: Id<'discussions'>
): Promise<null> {
  const byStatus = await Promise.all(
    ACTIVE_RUN_STATUSES.map((status) =>
      ctx.db
        .query('agentRuns')
        .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
          query.eq('discussionId', discussionId).eq('status', status)
        )
        .take(STALE_RUN_BATCH)
    )
  );
  await Promise.all(byStatus.flat().map((run) => abortActiveRun(ctx, run)));
  return null;
}

async function abortActiveForDiscussion(
  ctx: RunWriter,
  discussionId: Id<'discussions'>
): Promise<null> {
  // The streaming turn is the one the participant pressed stop on; a queued one may be behind it.
  const running = await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
      query.eq('discussionId', discussionId).eq('status', 'running')
    )
    .order('desc')
    .first();
  return await abortActiveRun(ctx, running ?? (await activeDiscussionRun(ctx, discussionId)));
}

/**
 * Who may stop a run or cancel its wait. Issue and review runs: the person who started it, or
 * someone who administers its trip. Discussion runs: any participant (non-participants cannot
 * see the run at all).
 */
async function assertCanControl(
  ctx: RunReader,
  run: Doc<'agentRuns'>,
  workspace: Workspace
): Promise<void> {
  if (run.discussionId || run.createdBy.userId === workspace.userId) return;
  // A trip that is gone or outside the group grants nothing; any other failure surfaces.
  const trip =
    run.tripId && (await findVisibleTrip(ctx, run.tripId, workspace))
      ? await loadTripContext(ctx, run.tripId, workspace)
      : null;
  if (!trip || !isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can stop this run');
  }
}

/**
 * Stops a run. Issue and review runs: the person who started it, or someone who administers its
 * trip. Discussion runs: any participant (non-participants cannot see the run at all).
 */
async function stopRun(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<null> {
  const workspace = await requireWorkspace(ctx);
  const run = await requireOrgRun(ctx, runId, workspace);
  await assertCanControl(ctx, run, workspace);
  await finish(ctx, { runId, status: 'aborted' });
  await AgentEngine.cancel(ctx, run);
  return null;
}

async function appendEvent(
  ctx: RunWriter,
  args: {
    detail?: string;
    input?: string;
    kind: Doc<'agentRunEvents'>['kind'];
    label: string;
    ok?: boolean;
    output?: string;
    runId: Id<'agentRuns'>;
    toolName?: string;
  }
): Promise<null> {
  const run = await ctx.db.get('agentRuns', args.runId);
  if (!run) throw new ConvexError('Agent run not found');
  const now = Date.now();
  await ctx.db.insert('agentRunEvents', {
    at: now,
    ...(args.detail ? { detail: args.detail } : {}),
    ...(args.input ? { input: args.input } : {}),
    kind: args.kind,
    label: args.label,
    ...(args.ok !== undefined ? { ok: args.ok } : {}),
    organizationId: run.organizationId,
    ...(args.output ? { output: args.output } : {}),
    runId: args.runId,
    seq: await nextSeq(ctx, args.runId),
    ...(args.toolName ? { toolName: args.toolName } : {})
  });
  await ctx.db.patch('agentRuns', args.runId, {
    headline: args.label,
    updatedAt: now
  });
  return null;
}

async function appendToolEvents(
  ctx: RunWriter,
  args: {
    events: Array<{
      input?: string;
      label: string;
      ok: boolean;
      output?: string;
      toolName: string;
    }>;
    runId: Id<'agentRuns'>;
  }
): Promise<null> {
  if (args.events.length === 0) return null;
  const run = await ctx.db.get('agentRuns', args.runId);
  if (!run) throw new ConvexError('Agent run not found');
  const now = Date.now();
  const startSeq = await nextSeq(ctx, args.runId);
  await Promise.all(
    args.events.map((event, index) =>
      ctx.db.insert('agentRunEvents', {
        at: now,
        ...(event.input ? { input: event.input } : {}),
        kind: 'tool',
        label: event.label,
        ok: event.ok,
        organizationId: run.organizationId,
        ...(event.output ? { output: event.output } : {}),
        runId: args.runId,
        seq: startSeq + index,
        toolName: event.toolName
      })
    )
  );
  const lastEvent = args.events[args.events.length - 1];
  if (lastEvent) {
    await ctx.db.patch('agentRuns', args.runId, {
      headline: lastEvent.label,
      updatedAt: now
    });
  }
  return null;
}

async function appendStepEvents(
  ctx: RunWriter,
  args: {
    events: Array<
      | { detail: string; kind: 'thought'; label: string }
      | {
          input?: string;
          kind: 'tool';
          label: string;
          ok: boolean;
          output?: string;
          toolName: string;
        }
    >;
    runId: Id<'agentRuns'>;
  }
): Promise<null> {
  if (args.events.length === 0) return null;
  const run = await ctx.db.get('agentRuns', args.runId);
  if (!run) throw new ConvexError('Agent run not found');
  const now = Date.now();
  const startSeq = await nextSeq(ctx, args.runId);
  await Promise.all(
    args.events.map((event, index) =>
      event.kind === 'thought'
        ? ctx.db.insert('agentRunEvents', {
            at: now,
            detail: event.detail,
            kind: 'thought',
            label: event.label,
            organizationId: run.organizationId,
            runId: args.runId,
            seq: startSeq + index
          })
        : ctx.db.insert('agentRunEvents', {
            at: now,
            ...(event.input ? { input: event.input } : {}),
            kind: 'tool',
            label: event.label,
            ok: event.ok,
            organizationId: run.organizationId,
            ...(event.output ? { output: event.output } : {}),
            runId: args.runId,
            seq: startSeq + index,
            toolName: event.toolName
          })
    )
  );
  const lastEvent = args.events[args.events.length - 1];
  if (lastEvent) {
    await ctx.db.patch('agentRuns', args.runId, {
      headline: lastEvent.label,
      updatedAt: now
    });
  }
  return null;
}

/** Stable authorization inputs only; titles/status never affect audience permission. */
function rosterAudienceKey(run: Doc<'agentRuns'>): string {
  return JSON.stringify([
    run.tripId ?? run.issueId ?? run.proposalId ?? null,
    run.discussionId ?? null,
    Boolean(run.researchTask),
    run.researchTask ? run.createdBy.userId : null
  ]);
}

async function rosterWindow(
  ctx: QueryCtx,
  workspace: Workspace,
  agentId: Doc<'agentRuns'>['agentId'],
  authorization: { permissions: Map<string, Promise<boolean>>; remaining: number }
) {
  const candidates = ctx.db
    .query('agentRuns')
    .withIndex('by_organizationId_and_agentId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('agentId', agentId)
    )
    .order('desc');
  const runs: Doc<'agentRuns'>[] = [];
  let inspected = 0;
  for await (const run of candidates) {
    // This single sentinel read distinguishes true exhaustion from a truncated window.
    // At most 201 raw rows are read, and only the first 200 receive authorization checks.
    if (inspected === ROSTER_CANDIDATES_PER_AGENT) return { runs, incomplete: true };
    inspected += 1;
    const key = rosterAudienceKey(run);
    let permission = authorization.permissions.get(key);
    if (!permission) {
      // Reserve before starting I/O: all agent windows share one authorization budget.
      // Cached audiences are free to reuse, but an unchecked audience means incomplete history.
      if (authorization.remaining === 0) return { runs, incomplete: true };
      authorization.remaining -= 1;
      permission = canViewRun(ctx, run, workspace);
      authorization.permissions.set(key, permission);
    }
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Ordered authorization stops at 20 visible runs rather than checking the entire candidate budget.
    if (await permission) runs.push(run);
    if (runs.length === ROSTER_RUNS_PER_AGENT) return { runs, incomplete: false };
  }
  return { runs, incomplete: false };
}

async function roster(ctx: QueryCtx): Promise<AgentRosterItem[]> {
  const workspace = await requireWorkspace(ctx);
  // Worst-case linked working-copy chat authorization uses nine reads. Across the roster,
  // 200 checks plus 500 issue visibility checks (at most three each) stay below 4096 ranges.
  const authorization = {
    permissions: new Map<string, Promise<boolean>>(),
    remaining: ROSTER_CANDIDATES_PER_AGENT
  };
  const [windows, issueCandidates] = await Promise.all([
    Promise.all(
      assistantAgentList.map((agent) => rosterWindow(ctx, workspace, agent.id, authorization))
    ),
    ctx.db
      .query('tripIssues')
      .withIndex('by_organizationId_and_updatedAt', (query) =>
        query.eq('organizationId', workspace.organizationId)
      )
      .order('desc')
      .take(501)
  ]);
  const issueWindowIncomplete = issueCandidates.length > 500;
  const allIssues = issueCandidates.slice(0, 500);
  const tripAccess = new Map<Id<'trips'>, Promise<Doc<'trips'> | null>>();
  const issueVisibility = await Promise.all(
    allIssues.map((issue) => {
      let visible = tripAccess.get(issue.tripId);
      if (!visible) {
        visible = findVisibleTrip(ctx, issue.tripId, workspace);
        tripAccess.set(issue.tripId, visible);
      }
      return visible;
    })
  );
  const issues = allIssues.filter((_, index) => issueVisibility[index] !== null);
  return assistantAgentList.map((agent, index) => {
    const window = windows[index] ?? { runs: [], incomplete: false };
    const agentRuns = window.runs;
    const activeRunCount = countActiveAgentRuns(agentRuns);
    const assignedIssueCount = isIssueAssignableAgentId(agent.id)
      ? issueWindowIncomplete
        ? null
        : issues.filter(
            (issue) =>
              !isResolved(issue.status) &&
              issue.assignee?.kind === 'agent' &&
              issue.assignee.agentId === agent.id
          ).length
      : 0;
    const latest = agentRuns[0];
    return {
      activeRunCount: window.incomplete ? null : activeRunCount,
      runWindowIncomplete: window.incomplete,
      issueWindowIncomplete: isIssueAssignableAgentId(agent.id) && issueWindowIncomplete,
      assignedIssueCount,
      description: agent.description,
      id: agent.id,
      label: agent.label,
      lastActivityAt: latest?.updatedAt ?? null,
      latestRun: latest ? presentLatestRun(latest) : null,
      status:
        window.incomplete && activeRunCount === 0 ? 'unknown' : rosterStatusFromRuns(agentRuns),
      surface: agent.surface
    };
  });
}

async function getAgent(ctx: QueryCtx, agentId: string): Promise<AgentRosterItem> {
  if (!isAssistantAgentId(agentId)) throw new ConvexError('Agent not found');
  const items = await roster(ctx);
  const item = items.find((agent) => agent.id === agentId);
  if (!item) throw new ConvexError('Agent not found');
  return item;
}

async function listRuns(ctx: QueryCtx, agentId: string, paginationOpts: PaginationOptions) {
  if (!isAssistantAgentId(agentId)) throw new ConvexError('Agent not found');
  const workspace = await requireWorkspace(ctx);
  const result = await ctx.db
    .query('agentRuns')
    .withIndex('by_organizationId_and_agentId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('agentId', agentId)
    )
    .order('desc')
    .paginate(paginationOpts);
  return {
    ...result,
    page: (await visibleRuns(ctx, result.page, workspace)).map((run) => presentRun(run))
  };
}

async function listWorkspaceRuns(ctx: QueryCtx, paginationOpts: PaginationOptions) {
  const workspace = await requireWorkspace(ctx);
  requireRunPageSize(paginationOpts);
  const result = await ctx.db
    .query('agentRuns')
    .withIndex('by_organizationId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId)
    )
    .order('desc')
    .paginate(paginationOpts);
  return {
    ...result,
    page: (await visibleRuns(ctx, result.page, workspace)).map((run) => presentRun(run))
  };
}

async function getRun(ctx: QueryCtx, runId: Id<'agentRuns'>): Promise<AgentRunView> {
  const workspace = await requireWorkspace(ctx);
  const run = await requireOrgRun(ctx, runId, workspace);
  return presentRun(run, await relatedForRun(ctx, run, workspace.organizationId));
}

async function listEvents(
  ctx: QueryCtx,
  runId: Id<'agentRuns'>,
  paginationOpts: PaginationOptions
) {
  const workspace = await requireWorkspace(ctx);
  await requireOrgRun(ctx, runId, workspace);
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > MAX_EVENT_PAGE
  ) {
    throw new ConvexError(`event page size must be between 1 and ${MAX_EVENT_PAGE}`);
  }
  const result = await ctx.db
    .query('agentRunEvents')
    .withIndex('by_runId_and_seq', (query) => query.eq('runId', runId))
    .order('desc')
    .paginate(paginationOpts);
  return { ...result, page: result.page.map(presentEvent) };
}

type AssignedIssueActivity = {
  issueId?: Id<'tripIssues'> | null;
  proposalId?: Id<'tripProposals'> | null;
  tripId?: Id<'trips'> | null;
};

function presentAssignedIssue(issue: Doc<'tripIssues'>) {
  return {
    id: issue._id,
    title: issue.title,
    tripId: issue.tripId,
    updatedAt: issue.updatedAt
  };
}

function isAssignedActiveIssue(issue: Doc<'tripIssues'>, agentId: string) {
  return (
    !isResolved(issue.status) &&
    issue.assignee?.kind === 'agent' &&
    issue.assignee.agentId === agentId
  );
}

async function assignedIssueIdForActivity(
  ctx: QueryCtx,
  workspace: Workspace,
  activity: AssignedIssueActivity
): Promise<Id<'tripIssues'> | null> {
  if (activity.issueId) {
    return activity.issueId;
  }
  if (!activity.proposalId) return null;
  const proposal = await ctx.db.get('tripProposals', activity.proposalId);
  if (
    !proposal ||
    proposal.organizationId !== workspace.organizationId ||
    !(await findVisibleTrip(ctx, proposal.sourceTripId, workspace))
  ) {
    return null;
  }
  return proposal.issueId ?? null;
}

async function assignedIssues(ctx: QueryCtx, agentId: string, activity: AssignedIssueActivity) {
  if (!isIssueAssignableAgentId(agentId)) return [];
  const workspace = await requireWorkspace(ctx);
  const issueId = await assignedIssueIdForActivity(ctx, workspace, activity);
  if (issueId) {
    const issue = await ctx.db.get('tripIssues', issueId);
    if (
      !issue ||
      issue.organizationId !== workspace.organizationId ||
      !isAssignedActiveIssue(issue, agentId) ||
      !(await findVisibleTrip(ctx, issue.tripId, workspace))
    ) {
      return [];
    }
    if (activity.tripId && issue.tripId !== activity.tripId) return [];
    return [presentAssignedIssue(issue)];
  }
  const tripId = activity.tripId;
  if (!tripId || !(await findVisibleTrip(ctx, tripId, workspace))) return [];
  const issues = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .order('desc')
    .take(MAX_ASSIGNED_ISSUES);
  return issues.flatMap((issue) =>
    issue.organizationId === workspace.organizationId && isAssignedActiveIssue(issue, agentId)
      ? [presentAssignedIssue(issue)]
      : []
  );
}

async function latestIssueRun(
  ctx: QueryCtx,
  issueId: Id<'tripIssues'>
): Promise<AgentRunView | null> {
  const workspace = await requireWorkspace(ctx);
  const issue = await ctx.db.get('tripIssues', issueId);
  if (
    !issue ||
    issue.organizationId !== workspace.organizationId ||
    !(await findVisibleTrip(ctx, issue.tripId, workspace))
  )
    return null;
  const run = await ctx.db
    .query('agentRuns')
    .withIndex('by_issueId_and_updatedAt', (query) => query.eq('issueId', issueId))
    .order('desc')
    .first();
  return run && (await canViewRun(ctx, run, workspace)) ? presentRun(run) : null;
}

async function latestProposalRun(
  ctx: QueryCtx,
  proposalId: Id<'tripProposals'>
): Promise<AgentRunView | null> {
  const workspace = await requireWorkspace(ctx);
  const proposal = await ctx.db.get('tripProposals', proposalId);
  if (
    !proposal ||
    proposal.organizationId !== workspace.organizationId ||
    !(await findVisibleTrip(ctx, proposal.sourceTripId, workspace))
  )
    return null;
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_proposalId_and_updatedAt', (query) => query.eq('proposalId', proposalId))
    .order('desc')
    .take(20);
  const run = runs.find(
    (candidate) =>
      candidate.agentId === 'reviewer' && candidate.organizationId === workspace.organizationId
  );
  return run && (await canViewRun(ctx, run, workspace)) ? presentRun(run) : null;
}

async function retryIssueRun(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<Id<'agentRuns'>> {
  const workspace = await requireWorkspace(ctx);
  const run = await requireOrgRun(ctx, runId, workspace);
  if (isActiveRunStatus(run.status)) {
    throw new ConvexError('Stop this run before re-running');
  }
  if (!run.issueId || !run.tripId || !isIssueAssignableAgentId(run.agentId)) {
    throw new ConvexError('Only Issue agent runs can be re-run');
  }
  const { issue, trip } = await issueWithTrip(ctx, run.issueId).catch(() => {
    throw new ConvexError('Agent run not found');
  });
  assertTripWritable(trip);
  if (!isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can re-run trip issues');
  }
  if (isResolved(issue.status)) throw new ConvexError('Resolved issues cannot be re-run');
  if (issue.assignee?.kind !== 'agent' || issue.assignee.agentId !== run.agentId) {
    throw new ConvexError('Re-assign the Issue agent before re-running');
  }
  const nextRunId = await queueIssueRun(ctx, {
    actorTokenIdentifier: workspace.tokenIdentifier,
    agentId: run.agentId,
    createdBy: { name: workspace.viewerName, userId: workspace.userId },
    issueId: run.issueId,
    kickoff: 'assign',
    organizationId: workspace.organizationId,
    title: issue.title,
    tripId: run.tripId
  });
  await AgentEngine.start(ctx, nextRunId);
  return nextRunId;
}

/** Workspace-visible agent roster, runs, and event logs. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentRuns {
  static abortActiveForDiscussion = abortActiveForDiscussion;
  static abortAllForDiscussion = abortAllForDiscussion;
  static abortActiveForIssue = abortActiveForIssue;
  static activeIssueRun = activeIssueRun;
  static appendEvent = appendEvent;
  static appendStepEvents = appendStepEvents;
  static appendToolEvents = appendToolEvents;
  static assertCanControl = assertCanControl;
  static assignedIssues = assignedIssues;
  static attachProposal = attachProposal;
  static claimDiscussionTurn = claimDiscussionTurn;
  static claimTurn = claimTurn;
  static failStaleRuns = failStaleRuns;
  static finish = finish;
  static getAgent = getAgent;
  static getRun = getRun;
  static latestIssueRun = latestIssueRun;
  static latestProposalRun = latestProposalRun;
  static listEvents = listEvents;
  static listRuns = listRuns;
  static listWorkspaceRuns = listWorkspaceRuns;
  static presentRun = presentRun;
  static previewReference = previewReference;
  static queueDiscussionTurn = queueDiscussionTurn;
  static queueIssueRun = queueIssueRun;
  static queueReviewRun = queueReviewRun;
  /** A run the viewer may see, or "Agent run not found". */
  static requireVisible = requireOrgRun;
  static retryIssueRun = retryIssueRun;
  static roster = roster;
  static stopRun = stopRun;
}
