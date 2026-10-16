import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { TripState } from './trip-detail-types';
import { TripToolbar } from './trip-toolbar';

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({ goingCount: 0, isLoading: false, travelers: [] })
}));

vi.mock('@/features/trips/trip-travelers/trip-travelers-sheet', () => ({
  TripTravelersSheet: ({ open }: { open: boolean }) => (open ? <div>Roster open</div> : null)
}));

vi.mock('./trip-navigation-actions', () => ({
  TripNavigationActions: ({ leading }: { leading?: ReactNode }) => (
    <>
      {leading}
      <button type="button">Trip actions</button>
    </>
  )
}));

function trip(overrides: Partial<TripDetail> = {}) {
  return {
    archivedAt: null,
    coverAttribution: null,
    coverStatus: 'ready',
    coverUrl: null,
    dateNotes: null,
    destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
    groupMemberCount: 4,
    id: 'trip-1' as Id<'trips'>,
    name: 'Summer escape',
    permissions: { canPropose: true },
    startDate: null,
    totalDurationDays: null,
    ...overrides
  } as TripDetail;
}

async function renderToolbar(
  value: TripDetail,
  props: Partial<Parameters<typeof TripToolbar>[0]> = {}
) {
  return render(
    <TripToolbar onEdit={vi.fn()} trip={value} tripState={{} as TripState} {...props} />
  );
}

describe('TripToolbar', () => {
  test('puts the board full screen toggle with the actions, on the board only', async () => {
    const view = await renderToolbar(trip());
    await expect.element(page.getByTestId(testIds.tripBoardFullscreen)).toBeVisible();
    await view.unmount();
    for (const section of ['overview', 'issues', 'ideas', 'activity'] as const) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each section renders and unmounts in turn.
      const other = await renderToolbar(trip(), { section });
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each section renders and unmounts in turn.
      await expect.element(page.getByTestId(testIds.tripBoardFullscreen)).not.toBeInTheDocument();
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each section renders and unmounts in turn.
      await other.unmount();
    }
  });

  test('shows name and fact chips with fallbacks', async () => {
    await renderToolbar(trip());
    await expect.element(page.getByTestId(testIds.tripHeading)).toHaveTextContent('Summer escape');
    await expect
      .element(page.getByTestId(testIds.sharedTripBanner))
      .toHaveTextContent('Shared plan · read-only');
    await expect.element(page.getByText('Portugal')).toBeVisible();
    await expect.element(page.getByText('Flexible dates')).toBeVisible();
    await expect.element(page.getByText('4 travelers')).toBeVisible();
    await expect.element(page.getByText(/days?$/)).not.toBeInTheDocument();
  });

  test('uses open destination, notes, and length when set', async () => {
    await renderToolbar(
      trip({
        dateNotes: 'Late spring',
        destination: { status: 'undecided' } as TripDetail['destination'],
        totalDurationDays: 8
      })
    );
    await expect.element(page.getByText('Destination open')).toBeVisible();
    await expect.element(page.getByText('Late spring')).toBeVisible();
    await expect.element(page.getByText('8 days')).toBeVisible();
  });

  test('gates New idea on canPropose and archived state', async () => {
    const start = vi.fn();
    const view = await renderToolbar(trip(), { onStartIdea: start });
    await page.getByRole('button', { name: /New idea/ }).click();
    expect(start).toHaveBeenCalledTimes(1);

    await view.rerender(
      <TripToolbar
        onEdit={vi.fn()}
        onStartIdea={start}
        trip={trip({ archivedAt: 1 })}
        tripState={{} as TripState}
      />
    );
    await expect
      .element(page.getByTestId(testIds.sharedTripBanner))
      .toHaveTextContent('Archived · read-only');
    await expect.element(page.getByRole('button', { name: /New idea/ })).not.toBeInTheDocument();

    await view.rerender(
      <TripToolbar
        onEdit={vi.fn()}
        onStartIdea={start}
        trip={trip({ permissions: { canPropose: false } as TripDetail['permissions'] })}
        tripState={{} as TripState}
      />
    );
    await expect.element(page.getByRole('button', { name: /New idea/ })).not.toBeInTheDocument();
  });

  test('opens the roster from the travelers chip and no longer offers Continue draft', async () => {
    await renderToolbar(trip());
    await expect.element(page.getByText('Continue draft')).not.toBeInTheDocument();
    await page.getByRole('button', { name: '4 travelers' }).click();
    await expect.element(page.getByText('Roster open')).toBeVisible();
  });

  test('renders the cover photo when the trip has one', async () => {
    const { container } = await renderToolbar(trip({ coverUrl: '/cover.jpg' }));
    const banner = container.querySelector('[data-slot="trip-toolbar"]');
    expect(banner?.getAttribute('data-cover')).toBe('image');
    expect(banner?.querySelector('img')?.getAttribute('src')).toBe('/cover.jpg');
  });

  test('falls back to a tinted banner without a cover and shows pending status', async () => {
    const { container } = await renderToolbar(trip({ coverStatus: 'pending' }));
    const banner = container.querySelector('[data-slot="trip-toolbar"]');
    expect(banner?.getAttribute('data-cover')).toBe('fallback');
    expect(banner?.querySelector('img')).toBeNull();
    await expect.element(page.getByText('Finding a cover image…')).toBeVisible();
  });

  test('lets cover editors find another image', async () => {
    const retryCover = vi.fn(async () => true);
    await renderToolbar(
      trip({
        coverStatus: 'failed',
        permissions: { canEditCover: true, canPropose: true } as TripDetail['permissions']
      }),
      { tripState: { retryCover } as unknown as TripState }
    );
    await page.getByRole('button', { name: 'Retry cover' }).click();
    expect(retryCover).toHaveBeenCalledTimes(1);
  });
});
