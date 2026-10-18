import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { ListFilterSection, ListFilterToolbar } from '@groam/ui/components/list-filter-toolbar';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { dataTableFilterLabels } from '@groam/ui/lib/data-table';
import { useNavigate } from '@tanstack/react-router';
import { Map as MapIcon, Plus } from 'lucide-react';
import { useMemo } from 'react';

import { useTripListAgentContext } from '@/features/trips/hooks/use-trip-list-agent-context';
import {
  tripStatusOptions,
  useTripListFilters
} from '@/features/trips/hooks/use-trip-list-filters';
import { useTrips, useWorkspaceTripProposals } from '@/features/trips/hooks/use-trips';
import { CreateTripDialog } from '@/features/trips/trip-create/create-trip-dialog';
import {
  groupProposalsByTrip,
  orderTripsByRecentActivity
} from '@/features/trips/trip-list/trip-list-order';
import { useLoadWhileFilteredEmpty } from '@/features/workspace/hooks/use-load-while-filtered-empty';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { TripListFilteredEmpty } from './trip-list-filtered-empty';
import { TripListPagination } from './trip-list-pagination';
import { TripWorkspaceSection } from './trip-workspace-section';

const TRIP_LIST_RESOURCE = { plural: 'trips', singular: 'trip' } as const;
const tripListFilterLabels = dataTableFilterLabels(TRIP_LIST_RESOURCE);

function tripListEmptyFilterMessage(filter: 'active' | 'all' | 'archived') {
  if (filter === 'active') return 'No active trips in this group.';
  if (filter === 'archived') return 'No archived trips in this group.';
  return 'No trips in this group.';
}

export function TripListView() {
  const { createTrip, isLoading, loadMore, status, trips } = useTrips();
  const proposalState = useWorkspaceTripProposals();

  const { activeOrganization } = useWorkspace();
  const createDialog = useOpenState(false);
  const navigate = useNavigate();
  const proposalsByTrip = useMemo(
    () => groupProposalsByTrip(proposalState.proposals),
    [proposalState.proposals]
  );
  const orderedTrips = useMemo(
    () => orderTripsByRecentActivity(trips, proposalsByTrip),
    [proposalsByTrip, trips]
  );
  const {
    clearFilters,
    empty,
    hasFilters,
    query,
    setQuery,
    setStatusFilter,
    statusFilter,
    visibleTrips
  } = useTripListFilters({
    emptyFilterMessage: tripListEmptyFilterMessage,
    trips: orderedTrips
  });

  const searching = useLoadWhileFilteredEmpty({
    isFilteredEmpty: visibleTrips.length === 0 && trips.length > 0,
    loadMore,
    status
  });

  useTripListAgentContext({
    activeGroup: activeOrganization.name,
    proposalCounts: proposalsByTrip,
    trips: visibleTrips
  });

  if (isLoading) return <PageLoading label="Loading trips…" />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.tripsTitle}>Trips</Shell.Title>
        <Shell.Description>
          <span className="sm:hidden">Your group’s plans in one place.</span>
          <span className="hidden sm:inline">Plan together. Keep every adventure moving.</span>
        </Shell.Description>
      </Shell.Header>
      {trips.length > 0 ? (
        <Shell.Action
          data-testid={testIds.createTrip}
          icon={<Plus />}
          onClick={createDialog.openPanel}
          text="Create trip"
        />
      ) : null}
      <Shell.Content>
        {trips.length === 0 ? (
          <Shell.PageStack>
            <EmptyScreen
              border
              buttonOnClick={createDialog.openPanel}
              buttonTestId={testIds.createTripEmpty}
              buttonText="Create your first trip"
              description="A destination and exact dates are optional. Start with the idea and your group."
              headline="Where should we go next?"
              icon={MapIcon}
            />
          </Shell.PageStack>
        ) : (
          <Shell.PageStack>
            <ListFilterSection>
              <ListFilterToolbar
                ariaLabel={tripListFilterLabels.toolbarAriaLabel}
                clearAriaLabel={tripListFilterLabels.clearAriaLabel}
                hasFilters={hasFilters}
                noun={TRIP_LIST_RESOURCE.plural}
                onClear={clearFilters}
                onQueryChange={setQuery}
                onStatusChange={setStatusFilter}
                query={query}
                resultCount={visibleTrips.length}
                searchAriaLabel={tripListFilterLabels.filterAriaLabel}
                searchPlaceholder={tripListFilterLabels.filterPlaceholder}
                status={statusFilter}
                statusAriaLabel="Filter trips by status"
                statusOptionTestId={testIds.tripStatusOption}
                statusOptions={tripStatusOptions}
                statusTestId={testIds.tripStatusFilter}
                totalCount={orderedTrips.length}
              />
              <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 2xl:grid-cols-3">
                {visibleTrips.length === 0 ? (
                  <TripListFilteredEmpty
                    message={empty}
                    onReset={clearFilters}
                    searching={searching}
                  />
                ) : (
                  visibleTrips.map((trip) => (
                    <TripWorkspaceSection
                      isLoadingProposals={proposalState.isLoading}
                      key={trip.id}
                      proposals={proposalsByTrip.get(trip.id) ?? []}
                      trip={trip}
                    />
                  ))
                )}
              </div>
            </ListFilterSection>
            {(status === 'CanLoadMore' || status === 'LoadingMore') && (
              <TripListPagination loadMore={loadMore} status={status} />
            )}
          </Shell.PageStack>
        )}
      </Shell.Content>
      {createDialog.open && (
        <CreateTripDialog
          createTrip={createTrip}
          onClose={createDialog.closePanel}
          onCreated={(tripId) => {
            createDialog.closePanel();
            void navigate({
              params: { section: 'board', tripId },
              to: '/trips/$tripId/$section'
            });
          }}
        />
      )}
    </Shell>
  );
}
