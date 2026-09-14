import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { listTripAttachments, setTripAttachments } from '#testing/attachments';
import { createOutsiderClient } from '#testing/factory';
import { pngBlob } from '#testing/media';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

async function insertPngMedia(
  owner: Awaited<ReturnType<typeof setupWritableTrip>>['owner'],
  files: { name: string; organizationId?: string }[]
) {
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');
  return await owner.client.run(async (ctx) =>
    Promise.all(
      files.map(async (file) => {
        const storageId = await ctx.storage.store(pngBlob());
        return ctx.db.insert('media', {
          contentType: 'image/png',
          createdBy: owner.userId,
          name: file.name,
          organizationId: file.organizationId ?? organizationId,
          size: 12,
          storageId
        });
      })
    )
  );
}

test('normalizes and reuses attachments across every attachable trip target', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const [firstMediaId, secondMediaId, thirdMediaId, foreignMediaId] = await insertPngMedia(owner, [
    { name: 'first.png' },
    { name: 'second.png' },
    { name: 'third.png' },
    { name: 'foreign.png', organizationId: 'another-organization' }
  ]);
  const tripTarget = { id: tripId, type: 'trip' as const };
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'EUR',
      destination: tripLocationInput(),
      duration: { totalDays: 3 },
      name: 'Attachment trip'
    },
    tripId
  });

  await setTripAttachments(owner.client, {
    mediaIds: [firstMediaId, secondMediaId],
    target: tripTarget,
    tripId
  });
  const initial = await listTripAttachments(owner.client, {
    target: tripTarget,
    tripId
  });
  expect(initial).toMatchObject([
    { mediaId: firstMediaId, name: 'first.png', position: 0 },
    { mediaId: secondMediaId, name: 'second.png', position: 1 }
  ]);
  expect(initial[0]?.url).toEqual(expect.any(String));
  await owner.client.run(async (ctx) => {
    const foreignAttachmentId = await ctx.db.insert('attachments', {
      mediaId: foreignMediaId,
      tripId
    });
    await ctx.db.insert('attachmentReferences', {
      attachmentId: foreignAttachmentId,
      position: 2,
      target: tripTarget,
      tripId
    });
  });
  await expect(
    listTripAttachments(owner.client, { target: tripTarget, tripId })
  ).resolves.toHaveLength(2);

  await setTripAttachments(owner.client, {
    mediaIds: [firstMediaId, secondMediaId],
    target: tripTarget,
    tripId
  });
  await setTripAttachments(owner.client, {
    mediaIds: [firstMediaId, secondMediaId],
    target: tripTarget,
    tripId
  });
  await setTripAttachments(owner.client, {
    mediaIds: [secondMediaId, firstMediaId],
    target: tripTarget,
    tripId
  });
  await expect(
    setTripAttachments(owner.client, {
      mediaIds: [firstMediaId, firstMediaId],
      target: tripTarget,
      tripId
    })
  ).rejects.toThrow('Attachment attachments must be unique');
  await expect(
    setTripAttachments(owner.client, {
      mediaIds: Array.from({ length: 11 }, () => firstMediaId),
      target: tripTarget,
      tripId
    })
  ).rejects.toThrow('Attachments support up to 10 attachments');
  await expect(
    setTripAttachments(owner.client, {
      mediaIds: [foreignMediaId],
      target: tripTarget,
      tripId
    })
  ).rejects.toThrow('Attachment attachment not found');

  const firstDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Lisbon', placeId: 'lisbon-attachment-target' }),
    tripId
  });
  const secondDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Porto', placeId: 'porto-attachment-target' }),
    tripId
  });
  const firstActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: firstDestinationId,
      input: tripActivityInput(),
      tripId
    }
  );
  const secondActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: firstDestinationId,
      input: tripActivityInput({ title: 'Dinner' }),
      tripId
    }
  );
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: firstDestinationId,
    input: { mode: 'train' },
    toDestinationId: secondDestinationId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: firstActivityId,
    input: { mode: 'walk' },
    toActivityId: secondActivityId,
    tripId
  });
  const detail = await owner.client.query(api.routes.trips.get.run, { tripId });
  const firstDetailedDestination = detail.destinations.find(
    (destination) => destination.id === firstDestinationId
  );
  const destinationTransferId = firstDetailedDestination?.transferToNext?.id;
  const activityTransferId = firstDetailedDestination?.activities[0]?.transferToNext?.id;
  if (!destinationTransferId || !activityTransferId) throw new Error('Expected transfers');

  const targets = [
    { id: firstDestinationId, type: 'destination' as const },
    { id: firstActivityId, type: 'activity' as const },
    { id: destinationTransferId, type: 'destination_transfer' as const },
    { id: activityTransferId, type: 'activity_transfer' as const }
  ];
  for (const target of targets) {
    await setTripAttachments(owner.client, {
      mediaIds: [firstMediaId],
      target,
      tripId
    });
    await expect(listTripAttachments(owner.client, { target, tripId })).resolves.toMatchObject([
      { mediaId: firstMediaId }
    ]);
  }

  await setTripAttachments(owner.client, {
    mediaIds: [thirdMediaId],
    target: tripTarget,
    tripId
  });
  const orphanAttachmentId = (
    await listTripAttachments(owner.client, {
      target: tripTarget,
      tripId
    })
  )[0]?.id;
  if (!orphanAttachmentId) throw new Error('Expected an attachment');
  await setTripAttachments(owner.client, {
    mediaIds: [],
    target: tripTarget,
    tripId
  });
  await expect(
    owner.client.run((ctx) => ctx.db.get('attachments', orphanAttachmentId))
  ).resolves.toBeNull();

  await expect(
    listTripAttachments(owner.client, {
      target: { id: secondDestinationId, type: 'destination' },
      tripId
    })
  ).resolves.toHaveLength(0);
});

test('rejects attachment targets owned by another trip', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      clientRequestId: crypto.randomUUID(),
      currency: 'USD',
      destination: { status: 'undecided' },
      name: 'Other trip'
    }
  });

  await expect(
    listTripAttachments(owner.client, {
      target: { id: otherTripId, type: 'trip' },
      tripId
    })
  ).rejects.toThrow('Trip target not found');
});

test('refuses unauthenticated and cross-organization attachment access', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const target = { id: tripId, type: 'trip' as const };

  await expect(
    owner.test.query(api.routes.trips.attachments.list.run, { target, tripId })
  ).rejects.toThrow('Not authenticated');
  await expect(
    owner.test.mutation(api.routes.trips.attachments.set.run, {
      mediaIds: [],
      target,
      tripId
    })
  ).rejects.toThrow('Not authenticated');

  const outsider = await createOutsiderClient(owner.test);

  await expect(listTripAttachments(outsider.client, { target, tripId })).rejects.toThrow(
    'Trip not found'
  );
  await expect(
    setTripAttachments(outsider.client, {
      mediaIds: [],
      target,
      tripId
    })
  ).rejects.toThrow('Trip not found');
});
