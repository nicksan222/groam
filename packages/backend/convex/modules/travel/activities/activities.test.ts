import { describe, expect, test } from 'vitest';
import type { Doc, Id } from '#convex-generated/dataModel';
import { setupGroup } from '#testing/trips';

function destination(schedule?: { endDay: number; startDay: number }): Doc<'tripDestinations'> {
  return {
    _creationTime: 0,
    _id: 'destination' as Id<'tripDestinations'>,
    coordinates: { latitude: 38.7, longitude: -9.1 },
    name: 'Lisbon',
    placeId: 'R:5400890',
    position: 0,
    tripId: 'trip' as Id<'trips'>,
    ...(schedule ? { schedule } : {})
  };
}

describe('ItineraryActivity.normalize', () => {
  test('trims text fields and keeps multi-day schedules inside the destination range', async () => {
    const { owner } = await setupGroup();
    await expect(
      owner.client.run(async () => {
        const { ItineraryActivity } = await import('#convex/modules/travel/activities/index');
        return ItineraryActivity.normalize(
          {
            address: '  Rue de Rivoli  ',
            notes: '  Book ahead  ',
            schedule: { day: 2, endDay: 4, timeBlock: 'afternoon' },
            title: '  Walking tour  '
          },
          destination({ endDay: 5, startDay: 1 })
        );
      })
    ).resolves.toMatchObject({
      address: 'Rue de Rivoli',
      notes: 'Book ahead',
      schedule: { day: 2, endDay: 4, timeBlock: 'afternoon' },
      title: 'Walking tour'
    });
  });

  test('rejects invalid days, text limits, and destination bounds', async () => {
    const { owner } = await setupGroup();
    const scheduledDestination = destination({ endDay: 3, startDay: 1 });
    const normalize = async (
      input: Parameters<
        typeof import('#convex/modules/travel/activities/index').ItineraryActivity.normalize
      >[0]
    ) =>
      owner.client.run(async () => {
        const { ItineraryActivity } = await import('#convex/modules/travel/activities/index');
        return ItineraryActivity.normalize(input, scheduledDestination);
      });

    await expect(
      normalize({ schedule: { day: 1.5, timeBlock: 'morning' }, title: 'Tour' })
    ).rejects.toThrow('activity day must be a whole number');
    await expect(
      normalize({ schedule: { day: 4, timeBlock: 'morning' }, title: 'Tour' })
    ).rejects.toThrow('activity days must fall within the destination day range');
    await expect(
      normalize({ schedule: { day: 2, endDay: 1, timeBlock: 'morning' }, title: 'Tour' })
    ).rejects.toThrow('activity end day cannot be before its start day');
    await expect(
      normalize({ schedule: { day: 1, timeBlock: 'morning' }, title: '   ' })
    ).rejects.toThrow('activity title must be between 1 and 100 characters');
  });
});
