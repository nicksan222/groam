import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { createTest } from '#testing/factory';
import { pngBlob } from '#testing/media';
import { setupGroup, tripInput } from '#testing/trips';

test('creates one organization-scoped trip shared with the whole group', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Casey Traveler');
  const input = tripInput({
    clientRequestId: 'same-create-request',
    currency: 'USD'
  });

  const tripId = await owner.client.action(api.routes.trips.create.run, { input });
  await expect(owner.client.action(api.routes.trips.create.run, { input })).resolves.toBe(tripId);
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: { ...input, name: 'A different trip' }
    })
  ).rejects.toThrow('client request id was already used for a different trip');
  await expect(member.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    coverStatus: null,
    coverUrl: null,
    currency: 'USD',
    dateNotes: null,
    destination: { status: 'undecided' },
    name: 'Summer beach idea'
  });
  await expect(owner.client.run((ctx) => ctx.db.query('trips').take(10))).resolves.toHaveLength(1);
  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 1,
      tripId
    })
  ).resolves.toBeNull();
  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.not.toMatchObject({
    coverGeneration: expect.any(Number),
    coverStatus: expect.any(String)
  });
});

test('normalizes known planning details and accepts a valid private image cover', async () => {
  const { owner } = await setupGroup();
  const coverStorageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      ...tripInput({
        currency: 'EUR',
        dateNotes: '  Mid September  ',
        destination: {
          coordinates: { latitude: 38.707_751, longitude: -9.136_592 },
          countryCode: 'pt',
          name: '  Lisbon, Portugal  ',
          placeId: ' R:5400890 ',
          status: 'known'
        },
        idealDurationDays: 8,
        initialBudget: 2500,
        minimumDurationDays: 5,
        name: '  Lisbon escape  '
      }),
      coverContentType: 'image/png',
      coverStorageId
    }
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    coverUrl: expect.any(String),
    currency: 'EUR',
    dateNotes: 'Mid September',
    destination: {
      countryCode: 'PT',
      coordinates: { latitude: 38.707_751, longitude: -9.136_592 },
      name: 'Lisbon, Portugal',
      placeId: 'R:5400890',
      status: 'known'
    },
    destinations: [
      expect.objectContaining({
        countryCode: 'PT',
        latitude: 38.707_751,
        longitude: -9.136_592,
        name: 'Lisbon, Portugal',
        placeId: 'R:5400890',
        position: 0
      })
    ],
    idealDurationDays: 8,
    initialBudget: 2500,
    minimumDurationDays: 5,
    name: 'Lisbon escape',
    totalDurationDays: 8
  });
});

test('rejects invalid durations, locations, and covers without writes', async () => {
  const { addUser, owner } = await setupGroup();
  await addUser('Group Member');

  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ idealDurationDays: 3, minimumDurationDays: 7 })
    })
  ).rejects.toThrow('ideal duration cannot be shorter');
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ minimumDurationDays: 7, totalDurationDays: 3 })
    })
  ).rejects.toThrow('total trip duration cannot be shorter');
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: tripInput({
        destination: {
          coordinates: { latitude: 95, longitude: 10 },
          name: 'Invalid place',
          placeId: 'invalid-place',
          status: 'known'
        }
      })
    })
  ).rejects.toThrow('latitude must be between -90 and 90');

  const textStorageId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['not an image'], { type: 'text/plain' }))
  );
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: { ...tripInput(), coverContentType: 'text/plain', coverStorageId: textStorageId }
    })
  ).rejects.toThrow('cover must be a JPEG, PNG, WebP, or AVIF image');

  const mismatchedStorageId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['not a png'], { type: 'image/png' }))
  );
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: {
        ...tripInput(),
        coverContentType: 'image/png',
        coverStorageId: mismatchedStorageId
      }
    })
  ).rejects.toThrow('cover contents do not match its image type');

  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: { ...tripInput(), currency: 'XXX' }
    } as never)
  ).rejects.toThrow(/Validator|ArgumentValidation|currency/i);

  const trips = await owner.client.run((ctx) => ctx.db.query('trips').take(20));
  expect(trips).toEqual([]);
});

test('requires authentication and an active organization', async () => {
  await expect(
    createTest().action(api.routes.trips.create.run, { input: tripInput() })
  ).rejects.toThrow('Not authenticated');

  const { owner } = await setupGroup();
  await expect(
    owner.client.action(api.routes.trips.create.run, { input: tripInput() })
  ).resolves.toBeDefined();
});
