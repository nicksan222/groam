import { describe, expect, test } from 'vitest';
import {
  normalizeDetails,
  normalizeKnownDestination
} from '#convex/modules/travel/trips/normalize';

describe('trip input normalization', () => {
  test('trims destinations and validates country codes', () => {
    expect(
      normalizeKnownDestination({
        coordinates: { latitude: 38.7, longitude: -9.1 },
        countryCode: ' pt ',
        name: '  Lisbon  ',
        placeId: ' R:5400890 ',
        status: 'known'
      })
    ).toMatchObject({
      countryCode: 'PT',
      name: 'Lisbon',
      placeId: 'R:5400890'
    });
    expect(() =>
      normalizeKnownDestination({
        coordinates: { latitude: 38.7, longitude: -9.1 },
        countryCode: 'PRT',
        name: 'Lisbon',
        placeId: 'R:5400890',
        status: 'known'
      })
    ).toThrow('destination country code must contain two letters');
  });

  test('trims trip details and applies duration defaults', () => {
    expect(
      normalizeDetails({
        currency: 'EUR',
        dateNotes: '  Mid September  ',
        destination: { status: 'undecided' },
        duration: { idealDays: 8, minimumDays: 5 },
        name: '  Lisbon escape  '
      })
    ).toMatchObject({
      dateNotes: 'Mid September',
      duration: { idealDays: 8, minimumDays: 5, totalDays: 8 },
      name: 'Lisbon escape'
    });
  });
});
