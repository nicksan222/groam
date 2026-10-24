import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripNavigation, TripState } from '@/features/trips/trip-detail/trip-detail-types';
import type { IdeaPlanningSection } from '@/types/ideas';
import { ActiveIdeaSection } from './active-idea-section';

vi.mock('@/features/trips/trip-destinations/trip-destinations-panel', () => ({
  TripDestinationsPanel: () => <p>destinations panel</p>
}));
vi.mock('@/features/trips/trip-packing/trip-packing-panel', () => ({
  TripPackingPanel: () => <p>packing panel</p>
}));
vi.mock('@/features/trips/trip-planner/trip-day-planner', () => ({
  TripDayPlanner: ({ onFlag }: { onFlag?: unknown }) => (
    <p>{onFlag ? 'day planner with flag' : 'day planner'}</p>
  )
}));
vi.mock('@/features/trips/trip-detail/trip-calendar-page', () => ({
  TripCalendarPage: ({ day }: { day?: number }) => <p>calendar page{day ? ` on day ${day}` : ''}</p>
}));
vi.mock('@/features/trips/trip-detail/trip-plan-page', () => ({
  TripPlanPage: ({ itinerary }: { itinerary: unknown }) => (
    <div>
      <p>plan page</p>
      {itinerary as never}
    </div>
  )
}));

function makeTrip(canEdit: boolean) {
  return {
    id: 'trip-1',
    permissions: { canEdit },
    proposal: { sourceTripId: 'source' }
  } as unknown as TripDetail;
}

const tripState = {} as TripState;
const navigation = {
  closeAddDestination: vi.fn(),
  openAddDestination: vi.fn(),
  openSection: vi.fn()
} as unknown as TripNavigation;

function renderSection(section: IdeaPlanningSection, trip: TripDetail, day?: number) {
  return render(
    <ActiveIdeaSection
      addDestinationOpen={false}
      day={day}
      navigation={navigation}
      proposalId={'idea-1' as never}
      section={section}
      trip={trip}
      tripState={tripState}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ActiveIdeaSection', () => {
  test.each([
    ['editors', true],
    ['non-editors', false]
  ] as const)('%s get the read-only days view on the overview', async (_, canEdit) => {
    await renderSection('overview', makeTrip(canEdit));
    await expect.element(page.getByText('plan page')).toBeVisible();
    await expect.element(page.getByText('day planner', { exact: true })).toBeVisible();
    await expect.element(page.getByText('day planner with flag')).not.toBeInTheDocument();
    await expect.element(page.getByText('destinations panel')).not.toBeInTheDocument();
  });

  test.each([true, false])('the packing tab renders (canEdit %s)', async (canEdit) => {
    await renderSection('packing', makeTrip(canEdit));
    await expect.element(page.getByText('packing panel')).toBeVisible();
    await expect.element(page.getByText('plan page')).not.toBeInTheDocument();
  });

  test('editors on the itinerary get the destinations panel only', async () => {
    await renderSection('itinerary', makeTrip(true));
    await expect.element(page.getByText('destinations panel')).toBeVisible();
    await expect.element(page.getByText('plan page')).not.toBeInTheDocument();
  });

  test('non-editors on the itinerary get the days view', async () => {
    await renderSection('itinerary', makeTrip(false));
    await expect.element(page.getByText('plan page')).toBeVisible();
  });

  test.each([true, false])('the calendar tab renders (canEdit %s)', async (canEdit) => {
    await renderSection('calendar', makeTrip(canEdit), 3);
    await expect.element(page.getByText('calendar page on day 3')).toBeVisible();
    await expect.element(page.getByText('plan page')).not.toBeInTheDocument();
  });
});
