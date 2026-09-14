import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { listTripAttachments, setTripAttachments } from '#testing/attachments';
import { pngBlob } from '#testing/media';
import { setupTrip } from '#testing/trips';
import { changedTripDetails, draftChangedVersion } from '#testing/versions';

test('applies mixed detail choices to the idea copy and leaves the shared trip unchanged', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  const sharedBefore = await owner.client.query(api.routes.trips.find.run, { tripId });
  const ideaBefore = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!sharedBefore || !ideaBefore) throw new Error('Expected both trip copies');

  await owner.client.mutation(api.routes.trips.versions.details.resolve.run, {
    choices: [
      { choice: 'shared', key: 'name' },
      { choice: 'mine', key: 'dateNotes' }
    ],
    expectedSharedUpdatedAt: sharedBefore.lastUpdatedAt,
    expectedWorkingUpdatedAt: ideaBefore.lastUpdatedAt,
    tripId: version.workingTripId
  });

  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({
    dateNotes: changedTripDetails.dateNotes,
    name: sharedBefore.name
  });
  await expect(owner.client.query(api.routes.trips.find.run, { tripId })).resolves.toMatchObject({
    dateNotes: sharedBefore.dateNotes,
    name: sharedBefore.name
  });
});

test('rejects stale choices instead of applying a diff reviewed against old data', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  const sharedBefore = await owner.client.query(api.routes.trips.find.run, { tripId });
  const ideaBefore = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!sharedBefore || !ideaBefore) throw new Error('Expected both trip copies');
  await owner.client.run(async (ctx) => {
    const shared = await ctx.db.get('trips', tripId);
    if (!shared) throw new Error('Expected shared trip');
    await ctx.db.patch('trips', tripId, {
      name: 'A newer shared name',
      updatedAt: shared.updatedAt + 1
    });
  });

  await expect(
    owner.client.mutation(api.routes.trips.versions.details.resolve.run, {
      choices: [{ choice: 'shared', key: 'name' }],
      expectedSharedUpdatedAt: sharedBefore.lastUpdatedAt,
      expectedWorkingUpdatedAt: ideaBefore.lastUpdatedAt,
      tripId: version.workingTripId
    })
  ).rejects.toThrow('The trip changed while you were reviewing');
});

test('denies resolution by a traveler who cannot edit the idea copy', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const traveler = users[0];
  if (!traveler) throw new Error('Expected a traveler');
  const version = await draftChangedVersion(owner, tripId);
  const shared = await owner.client.query(api.routes.trips.find.run, { tripId });
  const idea = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!shared || !idea) throw new Error('Expected both trip copies');

  await expect(
    traveler.client.mutation(api.routes.trips.versions.details.resolve.run, {
      choices: [{ choice: 'shared', key: 'name' }],
      expectedSharedUpdatedAt: shared.lastUpdatedAt,
      expectedWorkingUpdatedAt: idea.lastUpdatedAt,
      tripId: version.workingTripId
    })
  ).rejects.toThrow();
});

test('copies the shared attachment selection including removals', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    return await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy: owner.userId,
      name: 'idea-only.png',
      organizationId,
      size: 12,
      storageId
    });
  });
  const target = { id: version.workingTripId, type: 'trip' as const };
  await setTripAttachments(owner.client, {
    mediaIds: [mediaId],
    target,
    tripId: version.workingTripId
  });
  const shared = await owner.client.query(api.routes.trips.find.run, { tripId });
  const idea = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!shared || !idea) throw new Error('Expected both trip copies');

  await owner.client.mutation(api.routes.trips.versions.details.resolve.run, {
    choices: [{ choice: 'shared', key: 'attachments' }],
    expectedSharedUpdatedAt: shared.lastUpdatedAt,
    expectedWorkingUpdatedAt: idea.lastUpdatedAt,
    tripId: version.workingTripId
  });

  await expect(
    listTripAttachments(owner.client, { target, tripId: version.workingTripId })
  ).resolves.toEqual([]);
});
