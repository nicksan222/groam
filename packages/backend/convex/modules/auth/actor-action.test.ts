import { expect, test } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import type { Doc } from '#convex-generated/dataModel';
import { setupWritableTrip } from '#testing/trips';

type Trip = Awaited<ReturnType<typeof setupWritableTrip>>;

async function insertRun(trip: Trip, extra: Partial<Doc<'agentRuns'>> = {}) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentRuns', {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `act${Math.random().toString(36).slice(2, 7)}`,
      status: 'running',
      surface: 'chat',
      title: 'Actor action',
      updatedAt: Date.now(),
      ...extra
    })
  );
}

test('the action-side actor lookup reads a running run’s creator', async () => {
  const trip = await setupWritableTrip(0);
  const runId = await insertRun(trip, { actorTokenIdentifier: 'issuer|owner' });
  await expect(trip.owner.test.query(internal.modules.auth.actor.load, { runId })).resolves.toEqual(
    {
      organizationId: trip.owner.organizationId,
      tokenIdentifier: 'issuer|owner',
      userId: trip.owner.userId,
      viewerName: 'Owner'
    }
  );
});

test('a legacy run without a stored actor token acts under its creator’s user id', async () => {
  const trip = await setupWritableTrip(0);
  const runId = await insertRun(trip);
  await expect(
    trip.owner.test.query(internal.modules.auth.actor.load, { runId })
  ).resolves.toMatchObject({ tokenIdentifier: trip.owner.userId, userId: trip.owner.userId });
});

test('the action-side actor lookup is empty once a run stops', async () => {
  const trip = await setupWritableTrip(0);
  const runId = await insertRun(trip, { status: 'aborted' });
  await expect(
    trip.owner.test.query(internal.modules.auth.actor.load, { runId })
  ).resolves.toBeNull();
});

test(
  'an internal action without identity acts for the run creator through the lookup',
  { timeout: 15_000 },
  async () => {
    const trip = await setupWritableTrip(0);
    const runId = await insertRun(trip, { actorTokenIdentifier: 'issuer|owner' });
    // The draft is not approved, so the merge refuses; reaching that check proves the actor
    // resolved (no "Not authenticated" or "Agent run is not active").
    const error = await trip.owner.test
      .action(internal.modules.travel.versions.merge.action.apply, {
        asRun: runId,
        proposalId: trip.proposalId
      })
      .then(
        () => null,
        (caught: unknown) => String(caught)
      );
    expect(error).not.toBeNull();
    expect(error).not.toMatch(/Not authenticated|Agent run is not active/);
  }
);

test('an internal action refuses to act for a finished run', { timeout: 15_000 }, async () => {
  const trip = await setupWritableTrip(0);
  const runId = await insertRun(trip, { status: 'complete' });
  await expect(
    trip.owner.test.action(internal.modules.travel.versions.merge.action.apply, {
      asRun: runId,
      proposalId: trip.proposalId
    })
  ).rejects.toThrow('Agent run is not active');
});

test('an internal action without identity or run is refused', { timeout: 15_000 }, async () => {
  const trip = await setupWritableTrip(0);
  await expect(
    trip.owner.test.action(internal.modules.travel.versions.merge.action.apply, {
      proposalId: trip.proposalId
    })
  ).rejects.toThrow('Not authenticated');
});
