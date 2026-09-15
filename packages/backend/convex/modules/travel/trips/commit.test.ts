import { expect, test } from 'vitest';
import { internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { setupGroup, setupWritableTrip, tripInput } from '#testing/trips';

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

test('commit.setCover stores a validated upload through TripCover', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));

  await owner.client.mutation(internal.modules.travel.trips.commit.setCover, {
    contentType: 'image/png',
    signatureValid: true,
    storageId,
    tripId
  });

  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
    cover: {
      asset: { source: 'upload', storageId },
      generation: 1,
      status: 'ready'
    }
  });
});
