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

vi.mock('@groam/ui/components/page-loading', () => ({
  PageLoading: ({ label }: { label: string }) => <div data-loading="true">{label}</div>
}));

vi.mock('@/features/trips/trip-destinations/itinerary-details-banner', () => ({
  ItineraryDetailsBanner: ({ change }: { change: { entity: string } | null }) => (
    <div>details-banner:{change ? change.entity : 'none'}</div>
  )
}));

vi.mock('./active-idea-section', () => ({
  ActiveIdeaSection: ({
    addDestinationOpen,
    section
  }: {
    addDestinationOpen: boolean;
    section: string;
  }) => (
    <p>
      active-section:{section}:{String(addDestinationOpen)}
    </p>
  )
}));

const trip = { id: 'trip-2', name: 'Atlantic week' } as unknown as TripDetail;

function renderBody(
  overrides: Partial<{
    addDestinationOpen: boolean;
    showLoading: boolean;
    trip: TripDetail | undefined;
    view: IdeaCloneView;
  }> = {}
) {
  return render(
    <IdeaCloneBody
      addDestinationOpen={false}
      navigation={{} as TripNavigation}
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
      text: 'Loading idea…',
      tripValue: trip,
      view: 'overview'
    },
    {
      loading: false,
      name: 'overview without a trip',
      text: 'Loading idea…',
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
      await renderBody({ addDestinationOpen: true, view });
      await expect.element(page.getByText('active-section:itinerary:true')).toBeVisible();
    }
  );
});
