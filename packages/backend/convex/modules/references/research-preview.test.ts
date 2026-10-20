import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('unpaid members resolve only research navigation metadata while content stays protected', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const discussionId = await owner.client.mutation(api.routes.discussions.research.create.run, {
    clientRequestId: crypto.randomUUID(),
    title: 'Private research contents',
    brief: 'Hidden brief',
    tripId
  });
  const reference = await owner.client.query(api.routes.references.resolve.run, {
    table: 'discussions',
    reference: discussionId
  });
  expect(reference).not.toBeNull();
  for (const value of [discussionId, reference!.shortId]) {
    expect(
      await member.client.query(api.routes.references.resolve.run, {
        table: 'discussions',
        reference: value
      })
    ).toEqual({ id: discussionId, shortId: reference!.shortId, kind: 'research', tripId });
  }
  await expect(
    member.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).rejects.toThrow('Discussion not found');
  const outsider = await createOutsiderClient(owner.test);
  expect(
    await outsider.client.query(api.routes.references.resolve.run, {
      table: 'discussions',
      reference: reference!.shortId
    })
  ).toBeNull();
  await owner.test.run(
    async (ctx) => await ctx.db.patch('discussions', discussionId, { deletingAt: Date.now() })
  );
  expect(
    await member.client.query(api.routes.references.resolve.run, {
      table: 'discussions',
      reference: reference!.shortId
    })
  ).toBeNull();
});
