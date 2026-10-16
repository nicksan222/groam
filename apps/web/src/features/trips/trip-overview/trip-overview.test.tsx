import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { expectRouteStopPhotos } from '@/features/trips/expect-route-stop-photos';
import { nextStepFor } from '@/features/trips/hooks/trip-overview-next-step';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripOverview } from './trip-overview';
import { TripReadingOverview } from './trip-reading-overview';

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => ({
    add: vi.fn(),
    draft: '',
    isLoading: false,
    isPending: false,
    items: [],
    remove: vi.fn(),
    setDraft: vi.fn(),
    toggle: vi.fn()
  })
}));

const id = <Table extends 'tripDestinationActivities' | 'tripDestinations' | 'trips'>(
  value: string
) => value as Id<Table>;

function destination(
  overrides: Partial<TripDetail['destinations'][number]> = {}
): TripDetail['destinations'][number] {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: 4,
    id: id<'tripDestinations'>('destination-1'),
    sourceId: null,
    latitude: 38.7,
    longitude: -9.1,
    name: 'Lisbon',
    placeId: 'place-lisbon',
    position: 0,
    startDay: 1,
    stays: [],
    transferToNext: null,
    ...overrides
  };
}

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    coverAttribution: null,
    coverStatus: 'ready',
    coverUrl: null,
    currency: 'EUR',
    dateNotes: null,
    departureTransfer: null,
    destination: { countryCode: null, name: null, status: 'unknown' },
    destinations: [],
    groupMemberCount: 3,
    id: id<'trips'>('trip-1'),
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
    totalDurationDays: null,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

const handlers = {
  onAddDestination: vi.fn(),
  onEditDetails: vi.fn(),
  onOpenItinerary: vi.fn(),
  onStartVersion: vi.fn(),
  onUpdateDuration: vi.fn().mockResolvedValue(true)
};

describe('nextStepFor', () => {
  test('guides planners through destination, window, length, then itinerary', async () => {
    expect(
      nextStepFor({
        hasDestination: false,
        hasDuration: false,
        hasTravelWindow: false,
        ...handlers
      }).action
    ).toBe('Add first destination');
    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: false,
        hasTravelWindow: false,
        ...handlers
      }).action
    ).toBe('Add travel window');
    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: false,
        hasTravelWindow: true,
        ...handlers
      }).action
    ).toBe('Set trip length');
    expect(
      nextStepFor({
        hasDestination: true,
        hasDuration: true,
        hasTravelWindow: true,
        ...handlers
      }).action
    ).toBe('Build the itinerary');
  });
});

describe('TripOverview', () => {
  test('shows the empty-route prompt when a trip has no destinations', async () => {
    await render(<TripOverview trip={tripDetail()} {...handlers} />);

    await expect.element(page.getByText('No route yet')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Add first destination' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Plan this with me' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Summer escape' }))
      .not.toBeInTheDocument();
  });

  test('lists all route stops vertically when destinations exist', async () => {
    await render(
      <TripOverview
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [
            destination({ coverUrl: 'https://example.com/lisbon.jpg' }),
            destination({
              coverStatus: 'pending',
              endDay: 7,
              id: id<'tripDestinations'>('destination-2'),
              name: 'Porto',
              position: 1,
              startDay: 5
            })
          ],
          totalDurationDays: 7
        })}
        {...handlers}
      />
    );

    await expect.element(page.getByText('Lisbon')).toBeInTheDocument();
    await expect.element(page.getByText('Porto')).toBeInTheDocument();
    await expect.element(page.getByText('Trip basics')).toBeInTheDocument();
    const readiness = page.getByText('Trip basics').element().closest('aside');
    expect(readiness?.className).toContain('xl:sticky');
    expect(readiness?.className).not.toContain('order-first');
    expect(readiness?.parentElement?.className).toContain('xl:grid-cols-[minmax(0,1fr)_20rem]');
    await expect.element(page.getByRole('list', { name: 'Route stops' })).toBeInTheDocument();
    expect(document.querySelectorAll('.border-t.border-border').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-slot="overview-properties"]')).toBeTruthy();
    await expect.element(page.getByText('7 days')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="timeline"][data-variant="route"]')).toBeNull();
    await expectRouteStopPhotos('https://example.com/lisbon.jpg');
  });

  test('routes the next-step action to itinerary once foundations are set', async () => {
    const onOpenItinerary = vi.fn();
    await render(
      <TripOverview
        trip={tripDetail({
          dateNotes: 'May 2027',
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination({ endDay: 3, startDay: 1 })],
          totalDurationDays: 5
        })}
        {...handlers}
        onOpenItinerary={onOpenItinerary}
      />
    );

    await page.getByRole('button', { name: 'Build the itinerary' }).click();
    expect(onOpenItinerary).toHaveBeenCalledOnce();
  });

  test('lets a locked participant start an idea from the dates panel', async () => {
    const onStartVersion = vi.fn();
    await render(
      <TripOverview
        trip={tripDetail({
          permissions: {
            canArchive: false,
            canEdit: false,
            canEditCover: false,
            canPropose: true,
            canRestore: false,
            isReadOnly: true
          },
          startDate: '2026-08-01',
          totalDurationDays: 7
        })}
        {...handlers}
        onStartVersion={onStartVersion}
      />
    );

    await expect.element(page.getByText('This is the shared trip')).not.toBeInTheDocument();
    await expect
      .element(
        page.getByText(
          'Everyone sees these dates. Start an idea to try others — the shared trip stays put.'
        )
      )
      .toBeInTheDocument();
    await expect.element(page.getByText('Shared')).toBeInTheDocument();
    await page.getByRole('button', { name: 'New idea' }).click();
    expect(onStartVersion).toHaveBeenCalledOnce();
    expect(handlers.onEditDetails).not.toHaveBeenCalled();
    await expect.element(page.getByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
  });

  test('does not offer start-an-idea actions on an idea workspace', async () => {
    const onStartVersion = vi.fn();
    await render(
      <TripOverview
        trip={tripDetail({
          permissions: {
            canArchive: false,
            canEdit: true,
            canEditCover: true,
            canPropose: false,
            canRestore: false,
            isReadOnly: false
          },
          proposal: {
            author: { name: 'Alex', userId: 'user-alex' },
            baseUpdatedAt: 1,
            ideaName: 'coastal-route',
            sourceTripId: id<'trips'>('trip-shared'),
            status: 'draft'
          }
        })}
        {...handlers}
        onStartVersion={onStartVersion}
      />
    );

    await expect.element(page.getByText('This is the shared trip')).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New idea' })).not.toBeInTheDocument();
    expect(onStartVersion).not.toHaveBeenCalled();
  });

  test('does not duplicate Issues or Ideas lists on overview', async () => {
    await render(
      <TripOverview
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );

    await expect.element(page.getByRole('heading', { name: 'Issues' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Ideas' })).not.toBeInTheDocument();
  });

  test('shows packing in the planning overview, including idea copies', async () => {
    const shared = await render(
      <TripOverview
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );
    await expect.element(page.getByRole('heading', { name: 'Packing' })).toBeInTheDocument();
    await shared.unmount();

    const idea = await render(
      <TripOverview
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()],
          proposal: { status: 'draft' } as TripDetail['proposal']
        })}
        {...handlers}
      />
    );
    await expect.element(page.getByRole('heading', { name: 'Packing' })).toBeInTheDocument();
    await idea.unmount();

    await render(
      <TripOverview
        trip={tripDetail({
          archivedAt: Date.now(),
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );
    await expect.element(page.getByRole('heading', { name: 'Packing' })).not.toBeInTheDocument();
  });
});

describe('TripReadingOverview', () => {
  test.each([false, true])(
    'shows facts without planning controls when canPropose is %s',
    async (canPropose) => {
      await render(
        <TripReadingOverview
          itinerary={<section aria-label="Full itinerary">Lisbon itinerary</section>}
          trip={tripDetail({
            destinations: [destination()],
            initialBudget: 1500,
            totalDurationDays: 7,
            totalPlannedCost: 400,
            permissions: {
              canArchive: false,
              canEdit: false,
              canEditCover: false,
              canPropose,
              canRestore: false,
              isReadOnly: true
            }
          })}
        />
      );
      await expect.element(page.getByText(/ budget$/)).toBeInTheDocument();
      await expect.element(page.getByText('Stops', { exact: true })).not.toBeInTheDocument();
      await expect.element(page.getByText('Window', { exact: true })).not.toBeInTheDocument();
      await expect.element(page.getByText('Length', { exact: true })).not.toBeInTheDocument();
      await expect.element(page.getByRole('spinbutton')).not.toBeInTheDocument();
      await expect.element(page.getByText('Trip basics')).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: /Add stop|Edit details|Set trip length/u }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole('region', { name: 'Full itinerary' }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: 'View itinerary' }))
        .not.toBeInTheDocument();
      await expect.element(page.getByRole('heading', { name: 'Packing' })).toBeInTheDocument();
    }
  );

  test('shows a neutral empty state instead of an edit prompt, and no budget line without a number', async () => {
    await render(
      <TripReadingOverview
        itinerary={<p>No destinations planned yet</p>}
        trip={tripDetail({
          initialBudget: null,
          proposal: { status: 'in_review' } as TripDetail['proposal'],
          totalPlannedCost: 0,
          permissions: {
            canArchive: false,
            canEdit: false,
            canEditCover: false,
            canPropose: false,
            canRestore: false,
            isReadOnly: true
          }
        })}
      />
    );
    await expect.element(page.getByText('Planned / budget')).not.toBeInTheDocument();
    await expect.element(page.getByText('No destinations planned yet')).toBeInTheDocument();
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Packing' })).toBeInTheDocument();
  });
});
