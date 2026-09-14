import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { expectRouteStopPhotos } from '@/features/trips/expect-route-stop-photos';
import { nextStepFor } from '@/features/trips/hooks/trip-overview-next-step';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
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
  onUpdateDuration: vi.fn().mockResolvedValue(true),
  replaceCover: vi.fn().mockResolvedValue(true),
  retryCover: vi.fn().mockResolvedValue(true)
};

afterEach(() => {
  cleanup();
});

describe('nextStepFor', () => {
  test('guides planners through destination, window, length, then itinerary', () => {
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
  test('shows the empty-route prompt when a trip has no destinations', () => {
    render(<TripOverview hidePageCover trip={tripDetail()} {...handlers} />);

    expect(screen.getByText('No route yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add first destination' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Plan this with me' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Summer escape' })).toBeNull();
  });

  test('lists all route stops vertically when destinations exist', () => {
    render(
      <TripOverview
        hidePageCover
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

    expect(screen.getByText('Lisbon')).toBeTruthy();
    expect(screen.getByText('Porto')).toBeTruthy();
    expect(screen.getByText('Trip basics')).toBeTruthy();
    const readiness = screen.getByText('Trip basics').closest('aside');
    expect(readiness?.className).toContain('xl:sticky');
    expect(readiness?.className).not.toContain('order-first');
    expect(readiness?.parentElement?.className).toContain('xl:grid-cols-[minmax(0,1fr)_20rem]');
    expect(screen.getByRole('list', { name: 'Route stops' })).toBeTruthy();
    expect(document.querySelectorAll('.border-t.border-border').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-slot="overview-properties"]')).toBeTruthy();
    expect(screen.getByText('7 days')).toBeTruthy();
    expect(document.querySelector('[data-slot="timeline"][data-variant="route"]')).toBeNull();
    expectRouteStopPhotos('https://example.com/lisbon.jpg');
  });

  test('routes the next-step action to itinerary once foundations are set', () => {
    const onOpenItinerary = vi.fn();
    render(
      <TripOverview
        hidePageCover
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

    fireEvent.click(screen.getByRole('button', { name: 'Build the itinerary' }));
    expect(onOpenItinerary).toHaveBeenCalledOnce();
  });

  test('lets a locked participant start an idea from the dates panel', () => {
    const onStartVersion = vi.fn();
    render(
      <TripOverview
        hidePageCover
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

    expect(screen.queryByText('This is the shared trip')).toBeNull();
    expect(
      screen.getByText(
        'Everyone sees these dates. Start an idea to try others — the shared trip stays put.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Shared')).toBeTruthy();
    const dates = document.querySelector('#trip-length');
    expect(dates).toBeTruthy();
    fireEvent.click(within(dates as HTMLElement).getByRole('button', { name: 'New idea' }));
    expect(onStartVersion).toHaveBeenCalledOnce();
    expect(handlers.onEditDetails).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Saved' })).toBeNull();
  });

  test('does not offer start-an-idea actions on an idea workspace', () => {
    const onStartVersion = vi.fn();
    render(
      <TripOverview
        hidePageCover
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

    expect(screen.queryByText('This is the shared trip')).toBeNull();
    expect(screen.queryByRole('button', { name: 'New idea' })).toBeNull();
    expect(onStartVersion).not.toHaveBeenCalled();
  });

  test('does not duplicate Issues or Ideas lists on overview', () => {
    render(
      <TripOverview
        hidePageCover
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );

    expect(screen.queryByRole('heading', { name: 'Issues' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ideas' })).toBeNull();
  });

  test('shows packing in the planning overview, including idea copies', () => {
    const shared = render(
      <TripOverview
        hidePageCover
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );
    expect(shared.getByRole('heading', { name: 'Packing' })).toBeTruthy();
    shared.unmount();

    render(
      <TripOverview
        hidePageCover
        trip={tripDetail({
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()],
          proposal: { status: 'draft' } as TripDetail['proposal']
        })}
        {...handlers}
      />
    );
    expect(screen.getByRole('heading', { name: 'Packing' })).toBeTruthy();

    cleanup();
    const archived = render(
      <TripOverview
        hidePageCover
        trip={tripDetail({
          archivedAt: Date.now(),
          destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
          destinations: [destination()]
        })}
        {...handlers}
      />
    );
    expect(archived.queryByRole('heading', { name: 'Packing' })).toBeNull();
  });
});

describe('TripReadingOverview', () => {
  test.each([false, true])(
    'shows facts without planning controls when canPropose is %s',
    (canPropose) => {
      render(
        <TripReadingOverview
          itinerary={<section aria-label="Full itinerary">Lisbon itinerary</section>}
          trip={tripDetail({
            destinations: [destination()],
            totalDurationDays: 7,
            permissions: {
              canArchive: false,
              canEdit: false,
              canEditCover: false,
              canPropose,
              canRestore: false,
              isReadOnly: true
            }
          })}
          tripState={{} as TripState}
        />
      );
      expect(screen.getByText('7 days')).toBeTruthy();
      expect(screen.queryByRole('spinbutton')).toBeNull();
      expect(screen.queryByText('Trip basics')).toBeNull();
      expect(
        screen.queryByRole('button', { name: /Add stop|Edit details|Set trip length/u })
      ).toBeNull();
      expect(screen.getByRole('region', { name: 'Full itinerary' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'View itinerary' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Packing' })).toBeTruthy();
    }
  );

  test('shows a neutral empty state instead of an edit prompt', () => {
    render(
      <TripReadingOverview
        itinerary={<p>No destinations planned yet</p>}
        trip={tripDetail({
          proposal: { status: 'in_review' } as TripDetail['proposal'],
          permissions: {
            canArchive: false,
            canEdit: false,
            canEditCover: false,
            canPropose: false,
            canRestore: false,
            isReadOnly: true
          }
        })}
        tripState={{} as TripState}
      />
    );
    expect(screen.getByText('Idea preview')).toBeTruthy();
    expect(screen.getByText('No destinations planned yet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Packing' })).toBeTruthy();
  });
});
