import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripPageHero } from './trip-page-hero';

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({ goingCount: 3 })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/trips/hooks/use-trip-versions')>()),
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

async function renderHero(
  trip: TripDetail = tripDetail(),
  retryCover: () => Promise<boolean> = vi.fn().mockResolvedValue(true)
) {
  return render(
    <TripPageHero actions={null} retryCover={retryCover} trip={trip} tripId={trip.id} />
  );
}

describe('TripPageHero banner layout', () => {
  test('keeps its text inset so only the surrounding band goes full bleed', async () => {
    await renderHero();

    const row = page.getByTestId('trip-heading').element().closest('div')
      ?.parentElement?.parentElement;
    expect(row?.className).toContain('px-4');
    expect(row?.className).not.toContain('-mx-');
    expect(row?.className).not.toContain('w-screen');
  });

  test('separates the title, destination, and meta line', async () => {
    await renderHero();

    await expect.element(page.getByTestId('trip-destination')).toHaveClass('mt-1');
    await expect.element(page.getByTestId('trip-role')).toHaveClass('mt-1');
  });
});

describe('TripPageHero cover refresh', () => {
  test('lets an editor find another automatic cover from the thumbnail', async () => {
    const retryCover = vi.fn().mockResolvedValue(true);
    await renderHero(tripDetail(), retryCover);

    await page.getByRole('button', { name: 'Find another image' }).click();

    expect(retryCover).toHaveBeenCalledOnce();
    await expect
      .element(page.getByRole('button', { name: 'Find another image' }))
      .toBeInTheDocument();
  });

  test('shows a loading state on the thumbnail while a new cover is pending', async () => {
    await renderHero(tripDetail({ coverStatus: 'pending' }));

    const button = page.getByRole('button', { name: 'Finding another image' });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-busy', 'true');
    await expect.element(page.getByLabelText('Loading')).toBeInTheDocument();
    expect(button.element().parentElement?.className).toContain('opacity-100');
    expect(button.element().parentElement?.className).toContain('motion-reduce:transition-none');
  });

  test('disables the control while the refetch request is in flight', async () => {
    let resolveRetry: (value: boolean) => void = () => undefined;
    const retryCover = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRetry = resolve;
        })
    );
    await renderHero(tripDetail(), retryCover);

    await page.getByRole('button', { name: 'Find another image' }).click();

    await expect
      .element(page.getByRole('button', { name: 'Finding another image' }))
      .toBeDisabled();
    await expect.element(page.getByLabelText('Loading')).toBeInTheDocument();

    resolveRetry(true);
    await expect.element(page.getByRole('button', { name: 'Find another image' })).toBeEnabled();
  });

  test('labels a failed automatic cover as a retry', async () => {
    await renderHero(tripDetail({ coverAttribution: null, coverStatus: 'failed', coverUrl: null }));

    await expect.element(page.getByRole('button', { name: 'Retry cover' })).toBeInTheDocument();
  });

  test('hides the refetch control when the traveler cannot change the cover', async () => {
    await renderHero(
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

    await expect
      .element(page.getByRole('button', { name: 'Find another image' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Finding another image' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Retry cover' })).not.toBeInTheDocument();
  });

  test('does not offer refetch on an uploaded cover', async () => {
    await renderHero(tripDetail({ coverAttribution: null, coverStatus: 'ready' }));

    await expect
      .element(page.getByRole('button', { name: 'Find another image' }))
      .not.toBeInTheDocument();
  });
});
