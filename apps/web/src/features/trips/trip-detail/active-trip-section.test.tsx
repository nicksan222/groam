import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { ActiveTripSection } from './active-trip-section';
import type { TripNavigation, TripState } from './trip-detail-types';

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
vi.mock('@/features/trips/trip-packing/trip-packing-panel', () => ({
  TripPackingPanel: () => <p>packing panel</p>
}));
vi.mock('@/features/trips/trip-planner/trip-day-planner', () => ({
  TripDayPlanner: () => <p>day planner</p>
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
      section={section}
      trip={trip}
      tripState={tripState}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ActiveTripSection for a shared trip', () => {
  test.each([
    ['activity', 'history page'],
    ['issues', 'issues panel'],
    ['packing', 'packing panel'],
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
  test.each([
    ['editors', true],
    ['non-editors', false]
  ] as const)('%s get the shared plan page on the overview', async (_, canEdit) => {
    await renderSection('overview', makeTrip(true, canEdit));
    await expect.element(page.getByText('plan page')).toBeVisible();
    await expect.element(page.getByText('day planner')).toBeVisible();
    await expect.element(page.getByText('destinations panel')).not.toBeInTheDocument();
  });

  test.each([true, false])('the packing tab renders for an idea (canEdit %s)', async (canEdit) => {
    await renderSection('packing', makeTrip(true, canEdit));
    await expect.element(page.getByText('packing panel')).toBeVisible();
    await expect.element(page.getByText('plan page')).not.toBeInTheDocument();
  });

  test('editors on the itinerary get the destinations panel only', async () => {
    await renderSection('itinerary', makeTrip(true));
    await expect.element(page.getByText('destinations panel')).toBeVisible();
    await expect.element(page.getByText('plan page')).not.toBeInTheDocument();
  });

  test('non-editors on the itinerary get the plan page', async () => {
    await renderSection('itinerary', makeTrip(true, false));
    await expect.element(page.getByText('plan page')).toBeVisible();
  });
});
