import { DataTable, type FilterFn } from '@groam/ui/components/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@groam/ui/components/select';
import Shell from '@groam/ui/components/shell/client';
import { listFilterTriggerClassName } from '@groam/ui/lib/data-table';
import { History } from 'lucide-react';
import { useMemo } from 'react';
import {
  filterTripActivity,
  type TripActivityFilters,
  type TripActivityItem
} from '@/features/trips/hooks/trip-activity-history-filter';
import {
  ALL_ACTIVITY_TYPES,
  ALL_ACTIVITY_USERS,
  activityTypeLabels,
  useTripActivityFilters
} from '@/features/trips/hooks/use-trip-activity-filters';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { tripSectionDescriptions, tripSectionLabels } from '@/features/trips/trip-sections';
import { tripActivityColumns } from './trip-activity-history-columns';

const activityFilter: FilterFn<TripActivityItem> = (row, _columnId, value) =>
  filterTripActivity([row.original], {
    activityType: ALL_ACTIVITY_TYPES,
    query: String(value),
    userId: ALL_ACTIVITY_USERS
  }).length > 0;

export function TripActivityHistory({ activity }: { activity: TripDetail['activity'] }) {
  const {
    activityType,
    availableTypes,
    clearFilters,
    empty,
    eventCountLabel,
    hasExtraFilters,
    people,
    query,
    selectedPerson,
    setActivityType,
    setQuery,
    setUserId,
    userId,
    visibleActivity
  } = useTripActivityFilters(activity);
  const columns = useMemo(() => tripActivityColumns(), []);

  return (
    <TripSectionPanel
      badge={eventCountLabel}
      description={tripSectionDescriptions.activity}
      icon={History}
      title={tripSectionLabels.activity}
    >
      <Shell.Reveal>
        <DataTable
          columns={columns}
          data={visibleActivity}
          empty={empty}
          filterValue={query}
          getRowId={(item) => item.id}
          getRowProps={(item) => ({
            'data-activity-id': item.id,
            'data-activity-type': item.type
          })}
          globalFilterFn={activityFilter}
          hasExtraFilters={hasExtraFilters}
          onClear={clearFilters}
          onFilterValueChange={setQuery}
          resourceLabel={{ plural: 'activity', singular: 'activity' }}
          toolbarExtra={
            <>
              <Select onValueChange={setUserId} value={userId}>
                <SelectTrigger
                  aria-label="Filter activity by person"
                  className={listFilterTriggerClassName}
                  size="sm"
                >
                  <span className="truncate">{selectedPerson?.name ?? 'People'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ACTIVITY_USERS}>All people</SelectItem>
                  {people.map((person) => (
                    <SelectItem key={person.userId} value={person.userId}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  setActivityType(value as TripActivityFilters['activityType'])
                }
                value={activityType}
              >
                <SelectTrigger
                  aria-label="Filter activity by action"
                  className={listFilterTriggerClassName}
                  size="sm"
                >
                  <span className="truncate">
                    {activityType === ALL_ACTIVITY_TYPES
                      ? 'Actions'
                      : activityTypeLabels[activityType]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ACTIVITY_TYPES}>All actions</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {activityTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />
      </Shell.Reveal>
    </TripSectionPanel>
  );
}
