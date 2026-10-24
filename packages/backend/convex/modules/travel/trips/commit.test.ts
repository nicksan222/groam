import { expect, test } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import { setupGroup, tripInput } from '#testing/trips';

test('commit.create creates an organization trip through createTrip', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.mutation(internal.modules.travel.trips.commit.create, {
    input: tripInput({ name: 'Committed trip' }),
    signatureValid: true
  });

  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
    name: 'Committed trip',
    organizationId: owner.organizationId
  });
});
