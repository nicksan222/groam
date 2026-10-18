import {
  cancel as cancelWorkflow,
  createEvent,
  type EventId,
  sendEvent,
  type WorkflowId
} from '@convex-dev/workflow';
import { ConvexError } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { waitResumeValidator } from '#convex/modules/assistant/engine/schema';
import { MAX_TURNS } from '#convex/modules/assistant/engine/workflow';
import {
  conditionLabel,
  conditionRefId,
  evaluateCondition,
  evaluateSameRef,
  validateCondition
} from '#convex/modules/assistant/waits/conditions/index';
import type {
  WaitEvaluation,
  WaitLoadMemo
} from '#convex/modules/assistant/waits/conditions/types';
import type {
  AgentWaitView,
  WaitCondition,
  WaitKind,
  WaitReason
} from '#convex/modules/assistant/waits/schema';
import type { Workspace } from '#convex/modules/auth/workspace';

const MAX_WAIT_MS = 14 * 24 * 60 * 60 * 1000;
const SIGNAL_BATCH = 50;
const SUMMARY_LIMIT = 500;
const PENDING_RUNS_LIMIT = 20;

type ResolvedEvaluation = Omit<WaitEvaluation, 'snapshot'> & {
  snapshot?: WaitEvaluation['snapshot'];
};

const statusFor = { cancelled: 'cancelled', deadline: 'expired', met: 'met' } as const;
export const UNDELIVERED_WAIT_ERROR = 'The run could not resume after its wait. Try again.';

/**
 * `sendEvent` throws only when the event or its workflow step is gone or the event was already
 * used, never for a workflow that merely finished. The run can then never resume, so it fails
 * (and its workflow is cancelled) instead of staying `waiting`; the domain write that resolved
 * the wait still commits.
 */
async function failUndelivered(
  ctx: MutationCtx,
  wait: Doc<'agentWaits'>,
  error: unknown
): Promise<void> {
  console.error('agent wait event not delivered:', { runId: wait.runId, waitId: wait._id }, error);
  const run = await ctx.db.get('agentRuns', wait.runId);
  if (run && (run.status === 'waiting' || run.status === 'running' || run.status === 'queued')) {
    const now = Date.now();
    await ctx.db.patch('agentRuns', run._id, {
      completedAt: now,
      error: UNDELIVERED_WAIT_ERROR,
      headline: UNDELIVERED_WAIT_ERROR,
      status: 'failed',
      updatedAt: now
    });
  }
  try {
    await cancelWorkflow(ctx, components.workflow, wait.workflowId as WorkflowId);
  } catch (cancelError: unknown) {
    console.error('agent wait workflow not cancelled:', wait.workflowId, cancelError);
  }
}

/**
 * The single resolver. The status check makes resolution idempotent, and OCC serializes
 * concurrent resolvers, so a wait resolves (and its event is sent) at most once.
 */
async function resolve(
  ctx: MutationCtx,
  waitId: Id<'agentWaits'>,
  {
    evaluation,
    notify = true,
    reason
  }: { evaluation: ResolvedEvaluation; notify?: boolean; reason: WaitReason }
): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  if (wait?.status !== 'waiting') return false;
  await ctx.db.patch('agentWaits', waitId, {
    outcome: {
      progress: evaluation.progress,
      reason,
      ...(evaluation.snapshot ? { snapshot: evaluation.snapshot } : {}),
      summary: evaluation.summary.slice(0, SUMMARY_LIMIT)
    },
    resolvedAt: Date.now(),
    status: statusFor[reason]
  });
  if (!notify) return true;
  try {
    await sendEvent(ctx, components.workflow, {
      id: wait.eventId as EventId,
      validator: waitResumeValidator,
      value: { reason, waitId }
    });
  } catch (error: unknown) {
    await failUndelivered(ctx, wait, error);
  }
  return true;
}

/** The run's creator as a workspace member; conditions check what they may read. */
async function runCreator(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<Workspace> {
  const member = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    select: ['role'],
    where: [
      { field: 'organizationId', value: run.organizationId },
      { field: 'userId', value: run.createdBy.userId }
    ]
  })) as { role?: string } | null;
  if (!member?.role) throw new ConvexError('The person who started this run left the group');
  return {
    organizationId: run.organizationId,
    organizationRole: member.role,
    runId: run._id,
    tokenIdentifier: run.actorTokenIdentifier ?? run.createdBy.userId,
    userId: run.createdBy.userId,
    viewerName: run.createdBy.name
  };
}

async function create(
  ctx: MutationCtx,
  {
    condition,
    deadlineAt,
    runId
  }: { condition: WaitCondition; deadlineAt: number; runId: Id<'agentRuns'> }
): Promise<{ eventId: string; status: 'met' | 'waiting'; waitId: Id<'agentWaits'> }> {
  const run = await ctx.db.get('agentRuns', runId);
  if (run?.status !== 'running' || !run.workflowId) {
    throw new ConvexError('Only a running agent run can wait');
  }
  // `turns` counts the current turn; the workflow runs at most MAX_TURNS, so waiting on the
  // last one would leave nothing to resume with.
  if ((run.turns ?? 0) >= MAX_TURNS) {
    throw new ConvexError('This run has no turns left to resume after a wait; finish now');
  }
  if (run.activeWaitId) {
    const active = await ctx.db.get('agentWaits', run.activeWaitId);
    if (active?.status === 'waiting') throw new ConvexError('This run is already waiting');
  }
  const now = Date.now();
  if (!Number.isFinite(deadlineAt) || deadlineAt <= now) {
    throw new ConvexError('A wait needs a deadline in the future');
  }
  if (deadlineAt - now > MAX_WAIT_MS) {
    throw new ConvexError('A wait deadline can be at most 14 days away');
  }
  const { tripId } = await validateCondition(ctx, condition, {
    discussionId: run.discussionId ?? null,
    organizationId: run.organizationId,
    tripId: run.tripId ?? null,
    viewer: await runCreator(ctx, run)
  });
  const eventId = await createEvent(ctx, components.workflow, {
    name: `wait:${condition.kind}`,
    workflowId: run.workflowId as WorkflowId
  });
  const waitId = await ctx.db.insert('agentWaits', {
    condition,
    deadlineAt,
    eventId,
    kind: condition.kind,
    organizationId: run.organizationId,
    refId: conditionRefId(condition),
    runId,
    status: 'waiting',
    ...(tripId ? { tripId } : {}),
    workflowId: run.workflowId
  });
  await ctx.db.patch('agentRuns', runId, { activeWaitId: waitId, updatedAt: now });
  await ctx.scheduler.runAt(deadlineAt, internal.modules.assistant.waits.functions.expire, {
    waitId
  });
  // Already true (a poll that already reached its rule): resolve now; the workflow's
  // awaitEvent then returns at once with `met`.
  const evaluation = await evaluateCondition(ctx, condition);
  if (evaluation.met) await resolve(ctx, waitId, { evaluation, reason: 'met' });
  return { eventId, status: evaluation.met ? 'met' : 'waiting', waitId };
}

type SignalInput = {
  after?: number;
  deleted?: boolean;
  kind: WaitKind;
  /** Shared across signals in one transaction (the roster, trip RSVPs). */
  memo?: WaitLoadMemo;
  refId: string;
};

/**
 * Re-evaluates waits watching `refId` after its entity changed; returns how many resolved in
 * this batch. A full batch schedules the next one, so every waiting wait is evaluated. Batches
 * continue from the last wait's creation time instead of a `paginate` cursor, because one
 * transaction may signal several entities and Convex allows one paginated query per function.
 */
async function signal(
  ctx: MutationCtx,
  { after, deleted = false, kind, memo = new Map(), refId }: SignalInput
): Promise<number> {
  const page = await ctx.db
    .query('agentWaits')
    .withIndex('by_kind_and_refId_and_status', (query) => {
      const waiting = query.eq('kind', kind).eq('refId', refId).eq('status', 'waiting');
      return after === undefined ? waiting : waiting.gt('_creationTime', after);
    })
    .take(SIGNAL_BATCH);
  const last = page.at(-1);
  if (page.length === SIGNAL_BATCH && last) {
    await ctx.scheduler.runAfter(0, internal.modules.assistant.waits.functions.signal, {
      after: last._creationTime,
      deleted,
      kind,
      refId
    });
  }
  // Every wait in the batch watches this ref: one load, then each wait's own rule.
  const evaluations = await evaluateSameRef(
    ctx,
    page.map((wait) => wait.condition),
    memo
  );
  let resolved = 0;
  for (const [index, wait] of page.entries()) {
    const evaluation = evaluations[index];
    if (!evaluation) continue;
    if (deleted) {
      const removed = { ...evaluation, summary: `Cancelled: the watched ${kind} was deleted` };
      if (await resolve(ctx, wait._id, { evaluation: removed, reason: 'cancelled' })) resolved += 1;
      continue;
    }
    if (evaluation.met && (await resolve(ctx, wait._id, { evaluation, reason: 'met' })))
      resolved += 1;
  }
  return resolved;
}

/**
 * Resolves a waiting wait as cancelled. `notify: false` when the run itself is ending (stopped,
 * failed), so nothing resumes it.
 */
async function cancel(
  ctx: MutationCtx,
  { notify, reason, waitId }: { notify: boolean; reason: string; waitId: Id<'agentWaits'> }
): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  if (wait?.status !== 'waiting') return false;
  const summary = `Cancelled: ${reason}`;
  // A run that is ending closes its wait without reading the watched entity, so a missing or
  // oversized entity can never keep `onComplete` from finishing the run.
  const evaluation = notify
    ? await evaluateCondition(ctx, wait.condition).then(
        (live): ResolvedEvaluation => ({ ...live, summary }),
        (error: unknown): ResolvedEvaluation => {
          console.error('agent wait snapshot failed on cancel:', waitId, error);
          return { met: false, progress: null, summary };
        }
      )
    : { met: false, progress: null, summary };
  return await resolve(ctx, waitId, { evaluation, notify, reason: 'cancelled' });
}

/** Deadline handler body: a fresh snapshot, then `expired`. No-op once resolved. */
async function expire(ctx: MutationCtx, waitId: Id<'agentWaits'>): Promise<boolean> {
  const wait = await ctx.db.get('agentWaits', waitId);
  if (wait?.status !== 'waiting') return false;
  const evaluation = await evaluateCondition(ctx, wait.condition);
  return await resolve(ctx, waitId, { evaluation, reason: 'deadline' });
}

async function present(
  ctx: QueryCtx | MutationCtx,
  wait: Doc<'agentWaits'>,
  loadedRun?: Doc<'agentRuns'>
): Promise<AgentWaitView> {
  const live = wait.status === 'waiting' ? await evaluateCondition(ctx, wait.condition) : null;
  const run = loadedRun ?? (await ctx.db.get('agentRuns', wait.runId));
  if (!run) throw new ConvexError('Agent run not found');
  return {
    agentId: run.agentId,
    deadlineAt: wait.deadlineAt,
    id: wait._id,
    kind: wait.kind,
    label: await conditionLabel(ctx, wait.condition),
    progress: live?.progress ?? wait.outcome?.progress ?? null,
    runId: wait.runId,
    status: wait.status
  };
}

/** Waits of the discussion's suspended runs, newest run first. */
async function pendingForDiscussion(
  ctx: QueryCtx | MutationCtx,
  discussionId: Id<'discussions'>
): Promise<AgentWaitView[]> {
  const runs = await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
      query.eq('discussionId', discussionId).eq('status', 'waiting')
    )
    .order('desc')
    .take(PENDING_RUNS_LIMIT);
  const waits = await Promise.all(
    runs.map((run) => (run.activeWaitId ? ctx.db.get('agentWaits', run.activeWaitId) : null))
  );
  return await Promise.all(
    waits.flatMap((wait, index) => {
      const run = runs[index];
      return wait?.status === 'waiting' && run ? [present(ctx, wait, run)] : [];
    })
  );
}

/** Whether the group has a pending wait of any of these kinds (one indexed read per kind). */
async function anyWaiting(
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
  kinds: WaitKind[]
): Promise<boolean> {
  for (const kind of kinds) {
    const wait = await ctx.db
      .query('agentWaits')
      .withIndex('by_organizationId_and_status_and_kind', (query) =>
        query.eq('organizationId', organizationId).eq('status', 'waiting').eq('kind', kind)
      )
      .first();
    if (wait) return true;
  }
  return false;
}

/** Durable waits that suspend an agent run until a condition or deadline. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentWaits {
  static MAX_WAIT_MS = MAX_WAIT_MS;
  static anyWaiting = anyWaiting;
  static cancel = cancel;
  static create = create;
  static expire = expire;
  static pendingForDiscussion = pendingForDiscussion;
  static present = present;
  static signal = signal;
}
