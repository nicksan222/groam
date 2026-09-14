import { expect, test } from 'vitest';
import { TripActivityVersionModel } from '#convex/modules/travel/activities/schema';
import { TripDestinationVersionModel } from '#convex/modules/travel/destinations/schema';
import { TripStayVersionModel } from '#convex/modules/travel/stays/schema';
import { TripTransferVersionModel } from '#convex/modules/travel/transfers/schema';
import { TripVersionModel } from '#convex/modules/travel/trips/schema';
import { createTest } from '#testing/factory';
import { VersionChanges } from './diff';
import { VersionPresentation } from './presentation';

function snapshot(value: Record<string, unknown>) {
  return { files: [{ path: 'activities/activity.json', value: `${JSON.stringify(value)}\n` }] };
}

test('schema presentation hides internal fields and resolves media records', async () => {
  const t = createTest();
  const mediaId = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['image'], { type: 'image/png' }));
    return await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy: 'user',
      name: 'museum.png',
      organizationId: 'organization',
      size: 5,
      storageId
    });
  });
  const changes = VersionChanges.diff(
    snapshot({
      attachments: [],
      coordinates: { latitude: 1, longitude: 2 },
      destinationKey: 'internal-old',
      position: 0,
      title: 'Museum'
    }),
    snapshot({
      attachments: [mediaId],
      coordinates: { latitude: 3, longitude: 4 },
      destinationKey: 'internal-new',
      position: 2,
      title: 'Modern art museum'
    })
  );
  const presented = await t.run((ctx) => VersionPresentation.present(ctx, changes, 'organization'));

  expect(presented[0]?.fields.map((field) => field.key)).toEqual(['attachments', 'title']);
  expect(presented[0]?.fields[0]).toMatchObject({
    display: 'media',
    format: null,
    label: 'Attachments',
    mediaAfter: [{ contentType: 'image/png', id: mediaId, name: 'museum.png' }]
  });
});

test('sanitizes nested destination metadata before sending a diff to the client', async () => {
  const changes = VersionChanges.diff(
    {
      files: [
        {
          path: 'trip.json',
          value: '{"destination":{"name":"Lisbon","placeId":"old","status":"known"}}\n'
        }
      ]
    },
    {
      files: [
        {
          path: 'trip.json',
          value: '{"destination":{"name":"Porto","placeId":"new","status":"known"}}\n'
        }
      ]
    }
  );
  const t = createTest();
  const presented = await t.run((ctx) => VersionPresentation.present(ctx, changes, 'organization'));
  expect(presented[0]?.fields[0]).toMatchObject({
    after: { name: 'Porto' },
    before: { name: 'Lisbon' },
    format: 'destination',
    label: 'Destination'
  });
});

test('every versioned snapshot field has a presentation strategy and non-empty label', () => {
  const models = [
    TripVersionModel,
    TripDestinationVersionModel,
    TripActivityVersionModel,
    TripStayVersionModel,
    TripTransferVersionModel
  ];
  for (const model of models) {
    expect(Object.keys(model.fields).sort()).toEqual(Object.keys(model.presentation).sort());
    for (const presentation of Object.values(model.presentation)) {
      expect(presentation.label.trim()).not.toBe('');
      expect(['hidden', 'media', 'value']).toContain(presentation.display);
      if (presentation.display === 'value') expect(presentation.format).toEqual(expect.any(String));
    }
  }
});

test('rejects an unbounded media list before loading media documents', async () => {
  const changes = VersionChanges.diff(
    snapshot({ attachments: [], title: 'Museum' }),
    snapshot({
      attachments: Array.from({ length: 11 }, (_, index) => `media-${index}`),
      title: 'Museum'
    })
  );
  const t = createTest();
  await expect(
    t.run((ctx) => VersionPresentation.present(ctx, changes, 'organization'))
  ).rejects.toThrow('Attachment limit exceeded');
});
