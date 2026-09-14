import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

test('lets the trip creator restore an archived trip without losing planning data', async () => {
  const { owner, tripId } = await setupTrip(0);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await owner.client.mutation(api.routes.trips.restore.run, { tripId });
  await owner.client.mutation(api.routes.trips.restore.run, { tripId });

  const detail = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(detail).toMatchObject({
    archivedAt: null,
    name: 'Summer beach idea',
    permissions: { canArchive: true, canRestore: false, isReadOnly: true }
  });
  expect(detail.activity.filter(({ type }) => type === 'trip_restored')).toHaveLength(1);
});
