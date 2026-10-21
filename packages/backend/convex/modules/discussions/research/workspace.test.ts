import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

const requestId = () => `research-ws-${crypto.randomUUID()}`;

test('workspace research lists newest activity first with trip names', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const create = (title: string) =>
    owner.client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title,
      tripId
    });
  const older = await create('Older');
  const newer = await create('Newer');
  await owner.test.run(async (ctx) => {
    await ctx.db.patch('discussions', older, { updatedAt: Date.now() + 10_000 });
  });
  const items = await member.client.query(api.routes.discussions.research.workspace.run, {});
  expect(items.map((item) => item.id)).toEqual([older, newer]);
  expect(items[0]).toMatchObject({ title: 'Older', tripId });
  expect(items[0]?.tripName).toEqual(expect.any(String));
});

test('removed research is hidden, the list is capped at 8, other groups see nothing', async () => {
  const { owner, tripId } = await setupTrip(0);
  const removed = await owner.client.mutation(api.routes.discussions.research.create.run, {
    clientRequestId: requestId(),
    title: 'Gone',
    tripId
  });
  await owner.client.mutation(api.routes.discussions.research.remove.run, {
    discussionId: removed
  });
  await owner.test.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected trip');
    for (let index = 0; index < 9; index += 1) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- sequential insert
      await ctx.db.insert('discussions', {
        clientRequestId: requestId(),
        createdBy: { name: 'Owner', userId: owner.userId },
        kind: 'research',
        linkCount: 0,
        organizationId: trip.organizationId,
        participantCount: 1,
        shortId: `rs${index}${Math.random().toString(36).slice(2, 6)}`,
        title: `R${index}`,
        tripId,
        updatedAt: Date.now() + index
      });
    }
  });
  const items = await owner.client.query(api.routes.discussions.research.workspace.run, {});
  expect(items).toHaveLength(8);
  expect(items.some((item) => item.id === removed)).toBe(false);
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client.query(api.routes.discussions.research.workspace.run, {})
  ).resolves.toEqual([]);
  await expect(
    owner.test.query(api.routes.discussions.research.workspace.run, {})
  ).rejects.toThrow();
});
