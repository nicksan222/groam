import { RecordList } from '@groam/ui/components/record-list';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@groam/ui/components/select';
import Shell from '@groam/ui/components/shell/client';
import { listFilterTriggerClassName } from '@groam/ui/lib/data-table';
import type { RecordListSort } from '@groam/ui/lib/record-list';
import {
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
import { TripActivityHistoryRow } from './trip-activity-history-row';

const sortOptions: RecordListSort<TripActivityItem>[] = [
  { label: 'Default order', value: 'default' },
  { label: 'Newest first', value: 'newest', compare: (a, b) => b.createdAt - a.createdAt },
  { label: 'Oldest first', value: 'oldest', compare: (a, b) => a.createdAt - b.createdAt },
  { label: 'Event A–Z', value: 'event', compare: (a, b) => a.message.localeCompare(b.message) }
];

/** The activity list with its event count; the page around it supplies the title. */
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

  return (
    <Shell.Stack stack="md">
      <p className="text-xs text-muted-foreground">{eventCountLabel}</p>
      <Shell.Reveal>
        <RecordList
          items={visibleActivity}
          empty={empty}
          query={query}
          getKey={(item) => item.id}
          renderItem={(item) => <TripActivityHistoryRow item={item} />}
          sortOptions={sortOptions}
          hasExtraFilters={hasExtraFilters}
          onClear={clearFilters}
          onQueryChange={setQuery}
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
    </Shell.Stack>
  );
}
