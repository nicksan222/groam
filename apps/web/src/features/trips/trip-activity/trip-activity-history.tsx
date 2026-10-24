import { History } from '@groam/icons';
import { List } from '@groam/ui/components/list';
import { useMemo, useState } from 'react';
import {
  activityDayLabel,
  type TripActivityItem
} from '@/features/trips/hooks/trip-activity-history-filter';
import { useTripActivityFilters } from '@/features/trips/hooks/use-trip-activity-filters';
import { useTripListControls } from '@/features/trips/hooks/use-trip-list-controls';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripActivityHistoryRow } from './trip-activity-history-row';

const noun = { plural: 'events', singular: 'event' };
const sortOptions = [
  { label: 'Newest first', value: 'default' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Event A–Z', value: 'event' }
];

/** Orders the events and, unless sorted by name, starts a group for each day. */
function groupEvents(items: readonly TripActivityItem[], sort: string) {
  const ordered =
    sort === 'oldest'
      ? items.toSorted((a, b) => a.createdAt - b.createdAt)
      : sort === 'event'
        ? items.toSorted((a, b) => a.message.localeCompare(b.message))
        : items.toSorted((a, b) => b.createdAt - a.createdAt);
  const groups: { items: TripActivityItem[]; label: string | null }[] = [];
  for (const item of ordered) {
    const label = sort === 'event' ? null : activityDayLabel(item.createdAt);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ items: [item], label });
  }
  return groups;
}

/** The activity list with its event count; the page around it supplies the title. */
export function TripActivityHistory({ activity }: { activity: TripDetail['activity'] }) {
  const { empty, facets, query, setQuery, visibleActivity } = useTripActivityFilters(activity);
  const { searching, sorting } = useTripListControls();
  const [sort, setSort] = useState('default');
  const groups = useMemo(() => groupEvents(visibleActivity, sort), [visibleActivity, sort]);

  return (
    <List fill>
      <List.Search
        count={{ shown: visibleActivity.length, total: activity.length }}
        facets={facets}
        noun={noun}
        onOpenChange={(next) => (next ? searching.openPanel() : searching.closePanel())}
        onQueryChange={setQuery}
        open={searching.open}
        query={query}
      />
      <List.Body>
        {groups.length === 0 ? (
          <List.Empty headline={empty} icon={History} />
        ) : (
          groups.map((group) => (
            <List.Group
              aria-label="Events"
              count={group.label ? group.items.length : undefined}
              key={group.label ?? 'all'}
              label={group.label}
            >
              {group.items.map((item) => (
                <TripActivityHistoryRow item={item} key={item.id} />
              ))}
            </List.Group>
          ))
        )}
      </List.Body>
      <List.Footer desktopOnly>
        <List.Controls>
          <List.Sort
            noun={noun}
            onOpenChange={sorting.setOpen}
            onValueChange={setSort}
            open={sorting.open}
            options={sortOptions}
            value={sort}
          />
          <List.SearchTrigger onClick={searching.openPanel} />
        </List.Controls>
      </List.Footer>
    </List>
  );
}
