import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List, parseListSearch } from '@groam/ui/components/list';
import { useMemo, useState } from 'react';
import { useQueueItems } from '@/features/trip-queue/hooks/use-queue-items';
import { useQueueLedger } from '@/features/trip-queue/hooks/use-queue-ledger';
import { useTripCreateRequest } from '@/features/trips/hooks/use-trip-create-request';
import { useTripListControls } from '@/features/trips/hooks/use-trip-list-controls';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { tripSectionTitle } from '@/features/trips/trip-sections';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { PollFeed, QueueItem, QueueKind } from '@/types/queue';
import { QueueAddRow } from './queue-add-row';
import { QueueBatchBar } from './queue-batch-bar';
import { QueueCreateDialog } from './queue-create-dialog';
import { groupItems, settledGroupId } from './queue-groups';
import { compareQueueItems, filterQueueItems } from './queue-items';
import { QueueList } from './queue-list';
import { queueSearchFilters } from './queue-search-filters';
import { queueCopy, queueKindSection } from './queue-sections';
import { QueueShortcutFooter } from './queue-shortcut-footer';

const sortOptions = [
  { compare: compareQueueItems, label: 'Your turn first', value: 'priority' },
  ...recordListSorts<QueueItem>()
];

/**
 * One of the trip's queues (Ideas, Issues, or Polls) as one list: the viewer's turn first, settled
 * items folded at the end. It owns the issue and poll dialogs the header's
 * button opens; a new idea starts from the page.
 */
export function QueuePanel({
  kind,
  onStartIdea,
  pollFeed,
  trip
}: {
  kind: QueueKind;
  onStartIdea?: () => void;
  /** The trip's polls, opened once by the page; only Polls reads them. */
  pollFeed?: PollFeed;
  trip: TripDetail;
}) {
  const archived = trip.archivedAt !== null;
  const { canLoadMore, isLoading, items, loadMore } = useQueueItems({
    archived,
    kind,
    pollFeed,
    tripId: trip.id
  });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('priority');
  const selectedSort = sortOptions.find((option) => option.value === sort);
  const creating = useOpenState(false);
  const { searching, sorting } = useTripListControls();
  // The header asks for the kind this queue creates; Ideas never ask, as the page starts them.
  useTripCreateRequest(kind, creating.openPanel);
  const section = queueKindSection[kind];
  const { plural } = queueCopy[kind];
  const filters = useMemo(() => queueSearchFilters(kind, items), [kind, items]);
  const parsed = useMemo(() => parseListSearch(query, filters.keys), [query, filters]);
  const visible = useMemo(
    () =>
      filterQueueItems(items, { parsed, slugs: filters.slugs }).toSorted(
        selectedSort?.compare ?? compareQueueItems
      ),
    [items, parsed, filters.slugs, selectedSort]
  );
  const groups = useMemo(() => groupItems(visible), [visible]);
  const selectableIds = useMemo(
    () =>
      new Set(
        kind === 'issue' && !archived
          ? visible.filter((item) => item.canManage).map((item) => item.id)
          : []
      ),
    [archived, kind, visible]
  );
  const addable = kind === 'issue' && !archived;
  const ledger = useQueueLedger({
    addable,
    folded: [settledGroupId],
    groups,
    searching: query.trim() !== '',
    selectableIds
  });
  const selectedItems = useMemo(
    () => visible.filter((item) => ledger.selected.has(item.id)),
    [ledger.selected, visible]
  );
  const filtered = Object.keys(parsed.filters).length > 0;

  const start = kind === 'idea' ? onStartIdea : creating.openPanel;
  const canStart =
    !archived && start !== undefined && (kind !== 'idea' || trip.permissions.canPropose);
  const emptyAction = canStart ? (
    <Button onClick={start} size="sm">
      <Plus />
      {queueCopy[kind].create}
    </Button>
  ) : undefined;

  const addRow = addable ? <QueueAddRow tripId={trip.id} /> : undefined;

  return (
    <TripSectionPanel
      dataSection={section}
      stretch
      testId={testIds.queuePanel}
      title={tripSectionTitle(section)}
    >
      <List fill>
        <List.Search
          count={{ shown: visible.length, total: items.length }}
          facets={filters.facets}
          noun={{ plural, singular: plural.replace(/s$/u, '') }}
          onOpenChange={searching.setOpen}
          onQueryChange={setQuery}
          open={searching.open}
          placeholder={
            kind === 'issue'
              ? `Filter ${plural} by title, or try assignee:me`
              : kind === 'idea'
                ? `Filter ${plural} by title, status:in_review or author:me`
                : `Filter ${plural} by title, or try status:open`
          }
          query={query}
        />
        <QueueList
          addRow={addRow}
          archived={archived}
          emptyAction={emptyAction}
          filtered={filtered}
          groups={groups}
          isLoading={isLoading}
          items={visible}
          kind={kind}
          ledger={ledger}
          query={query}
          selectableIds={selectableIds}
        />
        {canLoadMore && kind === 'poll' ? (
          <Button className="self-center" onClick={loadMore} size="sm" variant="ghost">
            Show older polls
          </Button>
        ) : null}
        {selectedItems.length > 0 ? (
          <QueueBatchBar
            onClear={ledger.clearSelection}
            onDone={ledger.deselect}
            selected={selectedItems}
          />
        ) : null}
        <QueueShortcutFooter
          addable={addable}
          archived={archived}
          kind={kind}
          onOpenSearch={searching.openPanel}
          selectable={selectableIds.size > 0}
          sort={
            <List.Sort
              grouped
              noun={{ plural, singular: plural.replace(/s$/u, '') }}
              onOpenChange={sorting.setOpen}
              onValueChange={setSort}
              open={sorting.open}
              options={sortOptions}
              value={sort}
            />
          }
        />
      </List>
      <QueueCreateDialog
        kind={kind}
        onClose={creating.closePanel}
        open={creating.open}
        tripId={trip.id}
      />
    </TripSectionPanel>
  );
}
