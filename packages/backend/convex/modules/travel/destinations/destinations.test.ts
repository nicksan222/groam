import { describe, expect, test } from 'vitest';
import { setupGroup } from '#testing/trips';

describe('TripDestination.normalizeSchedule', () => {
  test('requires paired start and end days and trims day notes', async () => {
    const { owner } = await setupGroup();
    await expect(
      owner.client.run(async () => {
        const { TripDestination } = await import('#convex/modules/travel/destinations/index');
        return TripDestination.normalizeSchedule('  Food and old town  ', 1, 3);
      })
    ).resolves.toMatchObject({
      dayNotes: 'Food and old town',
      schedule: { endDay: 3, startDay: 1 }
    });
  });

  test('rejects partial schedules, invalid days, and reversed ranges', async () => {
    const { owner } = await setupGroup();
    const normalizeSchedule = (dayNotes?: string, startDay?: number, endDay?: number) =>
      owner.client.run(async () => {
        const { TripDestination } = await import('#convex/modules/travel/destinations/index');
        return TripDestination.normalizeSchedule(dayNotes, startDay, endDay);
      });

    await expect(normalizeSchedule(undefined, 1, undefined)).rejects.toThrow(
      'destination schedule must include a start day and end day'
    );
    await expect(normalizeSchedule(undefined, 0, 3)).rejects.toThrow(
      'destination start day must be between 1 and 365'
    );
    await expect(normalizeSchedule(undefined, 4, 2)).rejects.toThrow(
      'destination end day cannot be before its start day'
    );
  });
});

describe('TripDestination.normalize', () => {
  test('requires verified place metadata from location search', async () => {
    const { owner } = await setupGroup();
    await expect(
      owner.client.run(async () => {
        const { TripDestination } = await import('#convex/modules/travel/destinations/index');
        return TripDestination.normalize({
          countryCode: 'PT',
          name: 'Lisbon',
          status: 'known'
        } as Parameters<typeof TripDestination.normalize>[0]);
      })
    ).rejects.toThrow('Choose a verified place from location search');
  });
});
