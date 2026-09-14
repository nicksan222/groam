import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripPageHero } from './trip-page-hero';

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({ goingCount: 3 })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: [] })
}));

vi.mock('@/features/trips/trip-travelers/trip-travelers-sheet', () => ({
  TripTravelersSheet: () => null
}));

const coverAttribution = {
  creator: 'Public Domain Photographer',
  creatorUrl: 'https://example.com/photographer',
  license: 'CC0 1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceName: 'Wikimedia',
  sourceUrl: 'https://example.com/photo',
  title: 'Lisbon skyline'
};

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    arrivalTransfer: null,
    coverAttribution,
    coverStatus: 'ready',
    coverUrl: 'https://example.com/cover.jpg',
    currency: 'EUR',
    dateNotes: null,
    departureTransfer: null,
    destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
    destinations: [],
    groupMemberCount: 3,
    id: 'trip-1' as Id<'trips'>,
    initialBudget: null,
    name: 'Summer escape',
    permissions: {
      canArchive: true,
      canEdit: true,
      canEditCover: true,
      canPropose: false,
      canRestore: false,
      isReadOnly: false
    },
    proposal: null,
    role: 'organizer',
    startDate: null,
    totalDurationDays: 7,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

function renderHero(
  trip: TripDetail = tripDetail(),
  retryCover: () => Promise<boolean> = vi.fn().mockResolvedValue(true)
) {
  return render(
    <TripPageHero actions={null} retryCover={retryCover} trip={trip} tripId={trip.id} />
  );
}

afterEach(cleanup);

describe('TripPageHero banner layout', () => {
  test('keeps its text inset so only the surrounding band goes full bleed', () => {
    renderHero();

    const row = screen.getByTestId('trip-heading').closest('div')?.parentElement?.parentElement;
    expect(row?.className).toContain('px-4');
    expect(row?.className).not.toContain('-mx-');
    expect(row?.className).not.toContain('w-screen');
  });

  test('separates the title, destination, and meta line', () => {
    renderHero();

    expect(screen.getByTestId('trip-destination').className).toContain('mt-1');
    expect(screen.getByTestId('trip-role').className).toContain('mt-1');
  });
});

describe('TripPageHero cover refresh', () => {
  test('lets an editor find another automatic cover from the thumbnail', async () => {
    const retryCover = vi.fn().mockResolvedValue(true);
    renderHero(tripDetail(), retryCover);

    const button = screen.getByRole('button', { name: 'Find another image' });
    expect(button).toBeTruthy();
    fireEvent.click(button);

    expect(retryCover).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'Find another image' })).toBeTruthy();
  });

  test('shows a loading state on the thumbnail while a new cover is pending', () => {
    renderHero(tripDetail({ coverStatus: 'pending' }));

    const button = screen.getByRole('button', { name: 'Finding another image' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(button.parentElement?.className).toContain('opacity-100');
    expect(button.parentElement?.className).toContain('motion-reduce:transition-none');
  });

  test('disables the control while the refetch request is in flight', async () => {
    let resolveRetry: (value: boolean) => void = () => undefined;
    const retryCover = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRetry = resolve;
        })
    );
    renderHero(tripDetail(), retryCover);

    fireEvent.click(screen.getByRole('button', { name: 'Find another image' }));

    const busy = await screen.findByRole('button', { name: 'Finding another image' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Loading')).toBeTruthy();

    resolveRetry(true);
    expect(
      ((await screen.findByRole('button', { name: 'Find another image' })) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  test('labels a failed automatic cover as a retry', () => {
    renderHero(tripDetail({ coverAttribution: null, coverStatus: 'failed', coverUrl: null }));

    expect(screen.getByRole('button', { name: 'Retry cover' })).toBeTruthy();
  });

  test('hides the refetch control when the traveler cannot change the cover', () => {
    renderHero(
      tripDetail({
        permissions: {
          canArchive: false,
          canEdit: false,
          canEditCover: false,
          canPropose: true,
          canRestore: false,
          isReadOnly: true
        }
      })
    );

    expect(screen.queryByRole('button', { name: 'Find another image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finding another image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry cover' })).toBeNull();
  });

  test('does not offer refetch on an uploaded cover', () => {
    renderHero(tripDetail({ coverAttribution: null, coverStatus: 'ready' }));

    expect(screen.queryByRole('button', { name: 'Find another image' })).toBeNull();
  });
});
