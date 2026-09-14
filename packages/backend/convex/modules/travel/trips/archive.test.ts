import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { paginationArgs, setupTrip } from '#testing/trips';

test('archives without deleting data and makes the trip read-only for the whole group', async () => {
  const { owner, tripId, users } = await setupTrip(2);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });

  const detail = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(detail).toMatchObject({
    archivedAt: expect.any(Number),
    permissions: { canArchive: false, canRestore: true, isReadOnly: true }
  });
  expect(detail.activity.filter(({ type }) => type === 'trip_archived')).toHaveLength(1);
  for (const user of users) {
    await expect(user.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      permissions: { isReadOnly: true }
    });
  }
  await expect(
    owner.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject({
    page: [expect.objectContaining({ archivedAt: expect.any(Number), id: tripId })]
  });
});

test('bounds each trip activity feed to the 30 newest entries', async () => {
  const { owner, tripId } = await setupTrip(0);
  await owner.client.run(async (ctx) => {
    for (let index = 0; index < 29; index += 1) {
      await ctx.db.insert('tripAuditEvents', {
        actor: { name: 'Test Person', userId: owner.userId },
        message: `Historical activity ${index}`,
        tripId,
        type: 'details_updated'
      });
    }
  });

  await owner.client.mutation(api.routes.trips.archive.run, { tripId });

  const activity = await owner.client.run((ctx) =>
    ctx.db
      .query('tripAuditEvents')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .take(100)
  );
  expect(activity).toHaveLength(30);
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    activity: expect.arrayContaining([expect.objectContaining({ type: 'trip_archived' })])
  });
});
