import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { tripHeroFactsLine } from './trip-hero-facts';

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    destinations: [{ id: 'd1' as Id<'tripDestinations'> }],
    permissions: { canEdit: true },
    proposal: null,
    role: 'organizer',
    ...overrides
  } as TripDetail;
}

describe('tripHeroFactsLine', () => {
  test('folds idea source, author, and stops into one line', () => {
    expect(
      tripHeroFactsLine({
        destinationCount: 2,
        ideaAuthorName: 'Ada',
        role: 'organizer',
        sourceTripName: 'Coast week',
        trip: trip({
          proposal: {
            author: { name: 'Ada', userId: 'u1' },
            status: 'draft'
          }
        } as Partial<TripDetail>)
      })
    ).toBe('Idea on Coast week · by Ada · 2 stops');
  });

  test('falls back when the shared trip name is unknown', () => {
    expect(
      tripHeroFactsLine({
        destinationCount: 1,
        role: 'participant',
        trip: trip({
          proposal: {
            author: { name: 'Groam Demo', userId: 'u1' },
            status: 'draft'
          }
        } as Partial<TripDetail>)
      })
    ).toBe('Idea · by Groam Demo · 1 stop');
  });

  test('keeps shared-trip wording for non-idea trips', () => {
    expect(
      tripHeroFactsLine({
        destinationCount: 3,
        role: 'participant',
        trip: trip({ permissions: { canEdit: false } as TripDetail['permissions'] })
      })
    ).toBe('Shared trip · Member · 3 stops');
  });
});
