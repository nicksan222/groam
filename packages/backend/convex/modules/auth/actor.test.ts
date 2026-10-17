import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip, tripInput } from '#testing/trips';

async function runningRun(status: 'running' | 'complete' = 'running') {
  const trip = await setupTrip(1);
  const runId = await trip.owner.test.run(async (ctx) =>
    ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: 'actor001',
      status,
      surface: 'chat',
      title: 'Actor',
      updatedAt: Date.now()
    })
  );
  return { ...trip, runId };
}

test('an internal trip query acts for the creator of a running run without identity', async () => {
  const { owner, runId, tripId } = await runningRun();
  const context = await owner.test.query(internal.modules.assistant.model.index.tripContext, {
    asRun: runId,
    tripId
  });
  expect(context.tripName).toBeTruthy();
  const access = await owner.test.query(internal.modules.assistant.model.index.access, {
    asRun: runId
  });
  expect(access).toMatchObject({
    credentialOwnerUserId: owner.userId,
    organizationId: owner.organizationId,
    userId: 'issuer|owner'
  });
});

test('without identity or a run, internal builders still refuse', async () => {
  const { owner, tripId } = await runningRun();
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, { tripId })
  ).rejects.toThrow('Not authenticated');
});

test('a finished run no longer acts for anyone', async () => {
  const { owner, runId, tripId } = await runningRun('complete');
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, { asRun: runId, tripId })
  ).rejects.toThrow('Agent run is not active');
});

test('a creator removed from the group cannot be acted for', async () => {
  const { owner, runId, tripId } = await runningRun();
  await owner.test.run(async (ctx) => {
    await ctx.db.patch('agentRuns', runId, {
      createdBy: { name: 'Gone', userId: 'user-not-in-group' },
      updatedAt: Date.now()
    });
  });
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, { asRun: runId, tripId })
  ).rejects.toThrow('Organization access denied');
});

test('a signed-in caller is resolved from identity even when asRun is passed', async () => {
  const { runId, tripId, users } = await runningRun();
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const access = await member.client.query(internal.modules.assistant.model.index.access, {
    asRun: runId
  });
  expect(access.credentialOwnerUserId).toBe(member.userId);
  const context = await member.client.query(internal.modules.assistant.model.index.tripContext, {
    asRun: runId,
    tripId
  });
  expect(context.tripName).toBeTruthy();
});

test('public functions never accept a run to act for', async () => {
  const { owner, runId, tripId } = await runningRun();
  await expect(owner.test.query(api.routes.trips.get.run, { tripId })).rejects.toThrow(
    'Not authenticated'
  );
  await expect(
    owner.test.query(api.routes.trips.get.run, { asRun: runId, tripId } as never)
  ).rejects.toThrow(/extra field|Validator error/i);
  await expect(
    owner.test.query(api.routes.agents.list.run, { asRun: runId } as never)
  ).rejects.toThrow(/extra field|Validator error/i);
});

test('a run acts only inside its own group: another group’s trip is not found', async () => {
  const { owner, runId } = await runningRun();
  const outsider = await createOutsiderClient(owner.test);
  const otherTripId = await outsider.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await expect(
    owner.test.query(internal.modules.assistant.model.index.tripContext, {
      asRun: runId,
      tripId: otherTripId
    })
  ).rejects.toThrow('Trip not found');
});
