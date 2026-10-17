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
import type {
  AgentRosterItem,
  AgentRunEventView,
  AgentRunView
} from '#convex/modules/assistant/runs/schema';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { insertWithShortId } from '#convex/modules/references/index';
import { assertTripWritable, issueWithTrip } from '#convex/modules/travel/issues/guard';
import { isResolved } from '#convex/modules/travel/issues/status';
import { isTripAdmin, loadTripContext } from '#convex/modules/travel/trips/ctx';

const MAX_ASSIGNED_ISSUES = 200;
const MAX_EVENT_PAGE = 50;
const MAX_RUN_PAGE = 25;
const ROSTER_RUNS_PER_AGENT = 20;

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

/** Org match, plus discussion membership for discussion runs (their log carries the chat). */
async function canViewRun(
  ctx: RunReader,
  run: Doc<'agentRuns'>,
  workspace: Workspace
): Promise<boolean> {
  if (run.organizationId !== workspace.organizationId) return false;
  const discussionId = run.discussionId;
  if (!discussionId) return true;
  const membership = await ctx.db
    .query('discussionMembers')
    .withIndex('by_discussionId_and_userId', (query) =>
      query.eq('discussionId', discussionId).eq('userId', workspace.userId)
    )
    .unique();
  return membership !== null;
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

async function activeIssueRun(ctx: RunReader, issueId: Id<'tripIssues'>) {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_issueId_and_updatedAt', (query) => query.eq('issueId', issueId))
    .order('desc')
    .take(20);
  return runs.find((run) => run.status === 'queued' || run.status === 'running') ?? null;
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
    runs.find(
      (run) =>
        run.organizationId === organizationId &&
        (run.status === 'queued' || run.status === 'running')
    ) ?? null
  );
}

async function queueIssueRun(
  ctx: RunWriter,
  args: {
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
  const queued = await oldestQueuedDiscussionRun(ctx, args.discussionId);
  const now = Date.now();
  if (queued) {
    await ctx.db.patch('agentRuns', queued._id, {
      startedAt: queued.startedAt ?? now,
      status: 'running',
      threadId: args.threadId,
      updatedAt: now
    });
    return queued._id;
  }
  return await insertWithShortId(ctx, 'agentRuns', {
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

async function claim(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<Doc<'agentRuns'> | null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run) throw new ConvexError('Agent run not found');
  if (run.status === 'running' || run.status === 'complete' || run.status === 'failed') {
    return null;
  }
  if (run.status === 'aborted') return null;
  const now = Date.now();
  await ctx.db.patch('agentRuns', runId, {
    headline: 'Working…',
    startedAt: now,
    status: 'running',
    updatedAt: now
  });
  return { ...run, headline: 'Working…', startedAt: now, status: 'running', updatedAt: now };
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

const STALE_RUN_MS = 15 * 60 * 1000;
const STALE_RUN_BATCH = 100;
const STALE_RUN_ERROR = 'The run stopped responding. Try again.';

const STALE_QUEUED_MS = 10 * 60 * 1000;

/**
 * Fails runs that sit in `running` without progress (action timeout or crash) and `queued`
 * runs nobody started (closed tab, failed client start).
 */
async function failStaleRuns(ctx: RunWriter, now: number = Date.now()): Promise<number> {
  const [running, queued] = await Promise.all([
    ctx.db
      .query('agentRuns')
      .withIndex('by_status_and_updatedAt', (query) =>
        query.eq('status', 'running').lt('updatedAt', now - STALE_RUN_MS)
      )
      .take(STALE_RUN_BATCH),
    ctx.db
      .query('agentRuns')
      .withIndex('by_status_and_updatedAt', (query) =>
        query.eq('status', 'queued').lt('updatedAt', now - STALE_QUEUED_MS)
      )
      .take(STALE_RUN_BATCH)
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

async function abortActiveRun(ctx: RunWriter, run: Doc<'agentRuns'> | null): Promise<null> {
  if (!run) return null;
  if (run.status !== 'queued' && run.status !== 'running') return null;
  const now = Date.now();
  await ctx.db.patch('agentRuns', run._id, {
    completedAt: now,
    headline: 'Stopped',
    status: 'aborted',
    updatedAt: now
  });
  return null;
}

async function abortActiveForIssue(ctx: RunWriter, issueId: Id<'tripIssues'>): Promise<null> {
  return await abortActiveRun(ctx, await activeIssueRun(ctx, issueId));
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
 * Stops a run. Issue and review runs: the person who started it, or someone who administers its
 * trip. Discussion runs: any participant (non-participants cannot see the run at all).
 */
async function stopRun(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<null> {
  const workspace = await requireWorkspace(ctx);
  const run = await requireOrgRun(ctx, runId, workspace);
  if (!run.discussionId && run.createdBy.userId !== workspace.userId) {
    const trip = run.tripId
      ? await loadTripContext(ctx, run.tripId, workspace).catch(() => null)
      : null;
    if (!trip || !isTripAdmin(trip))
      throw new ConvexError('Only the trip creator or a group admin can stop this run');
  }
  return await finish(ctx, { runId, status: 'aborted' });
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

async function roster(ctx: QueryCtx): Promise<AgentRosterItem[]> {
  const workspace = await requireWorkspace(ctx);
  const [runsByAgent, issues] = await Promise.all([
    Promise.all(
      assistantAgentList.map(async (agent) =>
        visibleRuns(
          ctx,
          await ctx.db
            .query('agentRuns')
            .withIndex('by_organizationId_and_agentId_and_updatedAt', (query) =>
              query.eq('organizationId', workspace.organizationId).eq('agentId', agent.id)
            )
            .order('desc')
            .take(ROSTER_RUNS_PER_AGENT),
          workspace
        )
      )
    ),
    ctx.db
      .query('tripIssues')
      .withIndex('by_organizationId_and_updatedAt', (query) =>
        query.eq('organizationId', workspace.organizationId)
      )
      .order('desc')
      .take(500)
  ]);
  return assistantAgentList.map((agent, index) => {
    const agentRuns = runsByAgent[index] ?? [];
    const assignedIssueCount = isIssueAssignableAgentId(agent.id)
      ? issues.filter(
          (issue) =>
            !isResolved(issue.status) &&
            issue.assignee?.kind === 'agent' &&
            issue.assignee.agentId === agent.id
        ).length
      : 0;
    const latest = agentRuns[0];
    return {
      activeRunCount: countActiveAgentRuns(agentRuns),
      assignedIssueCount,
      description: agent.description,
      id: agent.id,
      label: agent.label,
      lastActivityAt: latest?.updatedAt ?? null,
      latestRun: latest ? presentLatestRun(latest) : null,
      status: rosterStatusFromRuns(agentRuns),
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
  if (!proposal || proposal.organizationId !== workspace.organizationId) {
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
      !isAssignedActiveIssue(issue, agentId)
    ) {
      return [];
    }
    if (activity.tripId && issue.tripId !== activity.tripId) return [];
    return [presentAssignedIssue(issue)];
  }
  const tripId = activity.tripId;
  if (!tripId) return [];
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
  if (!issue || issue.organizationId !== workspace.organizationId) return null;
  const run = await ctx.db
    .query('agentRuns')
    .withIndex('by_issueId_and_updatedAt', (query) => query.eq('issueId', issueId))
    .order('desc')
    .first();
  return run ? presentRun(run) : null;
}

async function retryIssueRun(ctx: RunWriter, runId: Id<'agentRuns'>): Promise<Id<'agentRuns'>> {
  const workspace = await requireWorkspace(ctx);
  const run = await requireOrgRun(ctx, runId, workspace);
  if (run.status === 'queued' || run.status === 'running') {
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
    agentId: run.agentId,
    createdBy: { name: workspace.viewerName, userId: workspace.userId },
    issueId: run.issueId,
    kickoff: 'assign',
    organizationId: workspace.organizationId,
    title: issue.title,
    tripId: run.tripId
  });
  // The client starts the run with the viewer's identity; trip tools need a signed-in user.
  return nextRunId;
}

/** Workspace-visible agent roster, runs, and event logs. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentRuns {
  static abortActiveForDiscussion = abortActiveForDiscussion;
  static abortActiveForIssue = abortActiveForIssue;
  static activeIssueRun = activeIssueRun;
  static appendEvent = appendEvent;
  static appendStepEvents = appendStepEvents;
  static appendToolEvents = appendToolEvents;
  static assignedIssues = assignedIssues;
  static attachProposal = attachProposal;
  static claim = claim;
  static claimDiscussionTurn = claimDiscussionTurn;
  static failStaleRuns = failStaleRuns;
  static finish = finish;
  static getAgent = getAgent;
  static getRun = getRun;
  static latestIssueRun = latestIssueRun;
  static listEvents = listEvents;
  static listRuns = listRuns;
  static listWorkspaceRuns = listWorkspaceRuns;
  static presentRun = presentRun;
  static queueDiscussionTurn = queueDiscussionTurn;
  static queueIssueRun = queueIssueRun;
  static queueReviewRun = queueReviewRun;
  static retryIssueRun = retryIssueRun;
  static roster = roster;
  static stopRun = stopRun;
}
