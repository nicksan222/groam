import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import type { WaitLoadMemo } from '#convex/modules/assistant/waits/conditions/types';
import { AgentWaits } from '#convex/modules/assistant/waits/index';

/** Open polls signalled per transaction; a full batch schedules the next one. */
const SIGNAL_POLL_BATCH = 20;

/** Whose open polls an eligibility change touches: one trip's, or the group's own. */
export type OpenPollScope = { organizationId: string } | { tripId: Id<'trips'> };

/**
 * Re-evaluates poll waits on open polls after who may vote changed. Batches continue from the
 * last poll's creation time, never a `paginate` cursor, and share one roster read.
 */
async function signalOpenPolls(
  ctx: MutationCtx,
  scope: OpenPollScope,
  { after, memo = new Map() }: { after?: number; memo?: WaitLoadMemo } = {}
): Promise<void> {
  const polls = await (
    'tripId' in scope
      ? ctx.db.query('polls').withIndex('by_tripId_and_status', (query) => {
          const open = query.eq('tripId', scope.tripId).eq('status', 'open');
          return after === undefined ? open : open.gt('_creationTime', after);
        })
      : ctx.db.query('polls').withIndex('by_organizationId_and_tripId_and_status', (query) => {
          const open = query
            .eq('organizationId', scope.organizationId)
            .eq('tripId', undefined)
            .eq('status', 'open');
          return after === undefined ? open : open.gt('_creationTime', after);
        })
  ).take(SIGNAL_POLL_BATCH);
  const last = polls.at(-1);
  if (polls.length === SIGNAL_POLL_BATCH && last) {
    await ctx.scheduler.runAfter(0, internal.modules.polls.functions.signalOpen, {
      after: last._creationTime,
      scope
    });
  }
  // Each poll's waits are distinct documents; the memo caches load promises, so it is shared safely.
  await Promise.all(
    polls.map((poll) => AgentWaits.signal(ctx, { kind: 'poll', memo, refId: poll._id }))
  );
}

/** A trip's RSVPs or roster changed: its RSVP waits and the waits on its open polls re-check. */
async function signalTripTravelers(ctx: MutationCtx, tripId: Id<'trips'>): Promise<void> {
  const memo: WaitLoadMemo = new Map();
  await AgentWaits.signal(ctx, { kind: 'rsvp', memo, refId: tripId });
  await signalOpenPolls(ctx, { tripId }, { memo });
}

/**
 * The write that changed RSVPs or membership schedules the re-check, so its own transaction
 * never pays (or fails on) the cost of evaluating every wait. Nothing is scheduled while the
 * group has no pending poll or RSVP wait.
 */
async function scheduleTripTravelers(
  ctx: MutationCtx,
  { organizationId, tripId }: { organizationId: string; tripId: Id<'trips'> }
): Promise<void> {
  if (!(await AgentWaits.anyWaiting(ctx, organizationId, ['rsvp', 'poll']))) return;
  await ctx.scheduler.runAfter(0, internal.modules.polls.functions.signalTravelers, { tripId });
}

async function scheduleOrganization(ctx: MutationCtx, organizationId: string): Promise<void> {
  if (!(await AgentWaits.anyWaiting(ctx, organizationId, ['poll']))) return;
  await ctx.scheduler.runAfter(0, internal.modules.polls.functions.signalOpen, {
    scope: { organizationId }
  });
}

/** Signals from writes that change who may vote. A leaf: imports no trip or discussion module. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class PollSignals {
  static openPolls = signalOpenPolls;
  static scheduleOrganization = scheduleOrganization;
  static scheduleTripTravelers = scheduleTripTravelers;
  static tripTravelers = signalTripTravelers;
}
