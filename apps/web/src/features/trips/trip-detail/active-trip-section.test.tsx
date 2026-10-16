import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { ActiveTripSection } from './active-trip-section';
import type { TripNavigation, TripState } from './trip-detail-types';

const updateTripDuration = vi.hoisted(() => vi.fn());

vi.mock('./update-trip-duration', () => ({ updateTripDuration }));
vi.mock('@/features/trips/trip-board/trip-board', () => ({
  TripBoard: () => <p>board panel</p>
}));
vi.mock('@/features/trips/trip-destinations/trip-destinations-panel', () => ({
  TripDestinationsPanel: () => <p>destinations panel</p>
}));
vi.mock('@/features/trips/trip-ideas/trip-ideas-panel', () => ({
  TripIdeasPanel: () => <p>ideas panel</p>
}));
vi.mock('@/features/trips/trip-issues/trip-issues-panel', () => ({
  TripIssuesPanel: () => <p>issues panel</p>
}));
vi.mock('@/features/trips/trip-overview/trip-overview', () => ({
  TripOverview: (props: {
    onAddDestination: () => void;
    onEditDetails: () => void;
    onOpenItinerary: () => void;
    onUpdateDuration: (days: number, startDate?: string) => void;
  }) => (
    <div>
      <p>editable overview</p>
      <button onClick={props.onAddDestination} type="button">
        add destination
      </button>
      <button onClick={props.onEditDetails} type="button">
        edit details
      </button>
      <button onClick={props.onOpenItinerary} type="button">
        open itinerary
      </button>
      <button onClick={() => props.onUpdateDuration(5, '2026-05-01')} type="button">
        update duration
      </button>
    </div>
  )
}));
vi.mock('@/features/trips/trip-overview/trip-reading-overview', () => ({
  TripReadingOverview: () => <p>reading overview</p>
}));
vi.mock('./trip-history-page', () => ({ TripHistoryPage: () => <p>history page</p> }));
vi.mock('./trip-plan-page', () => ({
  TripPlanPage: ({ itinerary }: { itinerary: unknown }) => (
    <div>
      <p>plan page</p>
      {itinerary as never}
    </div>
  )
}));

function makeTrip(proposal: boolean, canEdit = true) {
  return {
    id: 'trip-1',
    permissions: { canEdit },
    proposal: proposal ? { sourceTripId: 'source' } : null
  } as unknown as TripDetail;
}

const tripState = {} as TripState;
const navigation = {
  closeAddDestination: vi.fn(),
  openAddDestination: vi.fn(),
  openSection: vi.fn()
} as unknown as TripNavigation;

function renderSection(section: TripSection, trip: TripDetail) {
  return render(
    <ActiveTripSection
      addDestinationOpen={false}
      navigation={navigation}
      onEdit={onEdit}
      section={section}
      trip={trip}
      tripState={tripState}
    />
  );
}

const onEdit = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('ActiveTripSection for a shared trip', () => {
  test.each([
    ['activity', 'history page'],
    ['issues', 'issues panel'],
    ['ideas', 'ideas panel'],
    ['board', 'board panel']
  ] as const)('%s renders the %s', async (section, text) => {
    await renderSection(section, makeTrip(false));
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test.each(['overview', 'itinerary'] as const)(
    '%s renders the plan page with the itinerary',
    async (section) => {
      await renderSection(section, makeTrip(false));
      await expect.element(page.getByText('plan page')).toBeVisible();
      await expect.element(page.getByText('destinations panel')).toBeVisible();
    }
  );
});

describe('ActiveTripSection for an idea working copy', () => {
  test('non-editors get the reading overview', async () => {
    await renderSection('overview', makeTrip(true, false));
    await expect.element(page.getByText('reading overview')).toBeVisible();
  });

  test('editors on the itinerary get the destinations panel only', async () => {
    await renderSection('itinerary', makeTrip(true));
    await expect.element(page.getByText('destinations panel')).toBeVisible();
    await expect.element(page.getByText('editable overview')).not.toBeInTheDocument();
  });

  test('editors on the overview get the editable overview wired to navigation', async () => {
    await renderSection('overview', makeTrip(true));
    await expect.element(page.getByText('editable overview')).toBeVisible();
    await page.getByRole('button', { name: 'add destination' }).click();
    expect(navigation.openAddDestination).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'edit details' }).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'open itinerary' }).click();
    expect(navigation.openSection).toHaveBeenCalledWith('itinerary');
    await page.getByRole('button', { name: 'update duration' }).click();
    expect(updateTripDuration).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'trip-1' }),
      tripState,
      5,
      '2026-05-01'
    );
  });
});
