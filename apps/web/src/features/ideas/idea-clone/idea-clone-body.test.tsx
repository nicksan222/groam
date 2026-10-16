import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripNavigation, TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { IdeaCloneBody } from './idea-clone-body';
import type { IdeaCloneView } from './idea-sections';

const ideaState = vi.hoisted(() => ({ idea: null as unknown }));

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ideaState.idea
}));

vi.mock('@/features/trips/trip-versions/trip-version-detail', () => ({
  TripVersionDetail: ({ embedded, isLoading }: { embedded?: boolean; isLoading?: boolean }) => (
    <div data-embedded={String(Boolean(embedded))} data-loading={String(Boolean(isLoading))}>
      version-detail
    </div>
  )
}));

vi.mock('@/features/trips/trip-overview/trip-overview', () => ({
  TripOverview: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-loading={String(Boolean(isLoading))}>trip-overview</div>
  )
}));

vi.mock('@/features/trips/trip-destinations/itinerary-details-banner', () => ({
  ItineraryDetailsBanner: ({ change }: { change: { entity: string } | null }) => (
    <div>details-banner:{change ? change.entity : 'none'}</div>
  )
}));

vi.mock('@/features/trips/trip-detail/active-trip-section', () => ({
  ActiveTripSection: ({
    addDestinationOpen,
    onEdit,
    section
  }: {
    addDestinationOpen: boolean;
    onEdit: () => void;
    section: string;
  }) => (
    <button onClick={onEdit} type="button">
      active-section:{section}:{String(addDestinationOpen)}
    </button>
  )
}));

const trip = { id: 'trip-2', name: 'Atlantic week' } as unknown as TripDetail;

function renderBody(
  overrides: Partial<{
    addDestinationOpen: boolean;
    onEdit: () => void;
    showLoading: boolean;
    trip: TripDetail | undefined;
    view: IdeaCloneView;
  }> = {}
) {
  return render(
    <IdeaCloneBody
      addDestinationOpen={false}
      navigation={{} as TripNavigation}
      onEdit={vi.fn()}
      planningSection={'itinerary' as never}
      proposalId={'idea-1' as Id<'tripProposals'>}
      showLoading={false}
      trip={trip}
      tripState={{} as TripState}
      view="overview"
      {...overrides}
    />
  );
}

beforeEach(() => {
  ideaState.idea = null;
});

describe('IdeaCloneBody', () => {
  test.each<{
    loading: boolean;
    name: string;
    tripValue: TripDetail | undefined;
    text: string;
    view: IdeaCloneView;
  }>([
    {
      loading: true,
      name: 'overview while loading',
      text: 'trip-overview',
      tripValue: trip,
      view: 'overview'
    },
    {
      loading: false,
      name: 'overview without a trip',
      text: 'trip-overview',
      tripValue: undefined,
      view: 'overview'
    },
    {
      loading: true,
      name: 'compare while loading',
      text: 'version-detail',
      tripValue: trip,
      view: 'compare'
    },
    {
      loading: false,
      name: 'compare without a trip',
      text: 'version-detail',
      tripValue: undefined,
      view: 'compare'
    }
  ])('shows the $name skeleton', async ({ loading, text, tripValue, view }) => {
    await renderBody({ showLoading: loading, trip: tripValue, view });
    await expect.element(page.getByText(text)).toHaveAttribute('data-loading', 'true');
    await expect
      .element(page.getByText('details-banner', { exact: false }))
      .not.toBeInTheDocument();
  });

  test('compare shows the details banner above the embedded version detail', async () => {
    await renderBody({ view: 'compare' });
    await expect.element(page.getByText('details-banner:none')).toBeVisible();
    await expect.element(page.getByText('version-detail')).toHaveAttribute('data-embedded', 'true');
    await expect.element(page.getByText('version-detail')).toHaveAttribute('data-loading', 'false');
  });

  test('compare passes the idea details change to the banner', async () => {
    ideaState.idea = {
      proposal: { changes: [{ entity: 'destination' }, { entity: 'details' }] }
    };
    await renderBody({ view: 'compare' });
    await expect.element(page.getByText('details-banner:details')).toBeVisible();
  });

  test.each<IdeaCloneView>(['overview', 'itinerary'])(
    '%s shows the planning section',
    async (view) => {
      const onEdit = vi.fn();
      await renderBody({ addDestinationOpen: true, onEdit, view });
      const section = page.getByRole('button', { name: 'active-section:itinerary:true' });
      await expect.element(section).toBeVisible();
      await section.click();
      expect(onEdit).toHaveBeenCalledTimes(1);
    }
  );
});
