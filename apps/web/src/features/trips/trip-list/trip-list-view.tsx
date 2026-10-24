import { Map as MapIcon, Plus } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { ListFilterSection, ListFilterToolbar } from '@groam/ui/components/list-filter-toolbar';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { dataTableFilterLabels } from '@groam/ui/lib/data-table';

import { useTripsTurn } from '@/features/dashboard/hooks/use-trips-turn';
import { useTripListAgentContext } from '@/features/trips/hooks/use-trip-list-agent-context';
import {
  tripStatusOptions,
  useTripListFilters
} from '@/features/trips/hooks/use-trip-list-filters';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { TripCardGrid } from '@/features/trips/trip-card/trip-card-grid';
import { useLoadWhileFilteredEmpty } from '@/features/workspace/hooks/use-load-while-filtered-empty';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { TripListFilteredEmpty } from './trip-list-filtered-empty';
import { TripListPagination } from './trip-list-pagination';

const TRIP_LIST_RESOURCE = { plural: 'trips', singular: 'trip' } as const;
const tripListFilterLabels = dataTableFilterLabels(TRIP_LIST_RESOURCE);

function tripListEmptyFilterMessage(filter: 'active' | 'all' | 'archived') {
  if (filter === 'active') return 'No active trips in this group.';
  if (filter === 'archived') return 'No archived trips in this group.';
  return 'No trips in this group.';
}

/** The cards read the same one-query turn as Home, so the counts match; without it they stand bare. */
function TripListCards({ trips }: { trips: Parameters<typeof TripCardGrid>[0]['trips'] }) {
  return <TripCardGrid trips={trips} turn={useTripsTurn()} />;
}

export function TripListView() {
  const { isLoading, loadMore, status, trips } = useTrips();

  const { activeOrganization } = useWorkspace();
  const openDialog = useWorkspaceDialogs((state) => state.openDialog);
  const openCreate = () => openDialog('create-trip');
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
    trips
  });

  const searching = useLoadWhileFilteredEmpty({
    isFilteredEmpty: visibleTrips.length === 0 && trips.length > 0,
    loadMore,
    status
  });

  useTripListAgentContext({
    activeGroup: activeOrganization.name,
    trips: visibleTrips
  });

  if (isLoading) {
    return (
      <Shell>
        <PageLoading label="Loading trips…" />
      </Shell>
    );
  }

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Header
          actions={
            trips.length > 0 ? (
              <Shell.Action
                data-testid={testIds.createTrip}
                icon={Plus}
                label="Create trip"
                onClick={openCreate}
              />
            ) : null
          }
          meta="Every trip in this group, active and archived."
          title="Trips"
          titleProps={{ 'data-testid': testIds.tripsTitle }}
        />
        <Shell.PageBody>
          {trips.length === 0 ? (
            <EmptyScreen
              border
              buttonOnClick={openCreate}
              buttonTestId={testIds.createTripEmpty}
              buttonText="Create your first trip"
              description="A destination and exact dates are optional. Start with the idea and your group."
              headline="Where should we go next?"
              icon={MapIcon}
            />
          ) : (
            <>
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
                  totalCount={trips.length}
                />
                {visibleTrips.length === 0 ? (
                  <TripListFilteredEmpty
                    message={empty}
                    onReset={clearFilters}
                    searching={searching}
                  />
                ) : (
                  <TripListCards trips={visibleTrips} />
                )}
              </ListFilterSection>
              {(status === 'CanLoadMore' || status === 'LoadingMore') && (
                <TripListPagination loadMore={loadMore} status={status} />
              )}
            </>
          )}
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
