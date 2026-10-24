import { Lightbulb, CircleDot, Vote, type Icon } from '@groam/icons';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { ReactNode } from 'react';
import type { QueueGroup, QueueItem, QueueKind, QueueLedgerState } from '@/types/queue';
import { groupId, settledGroupId } from './queue-groups';
import { QueueRow } from './queue-row';
import { queueCopy } from './queue-sections';

const emptyIcon: Record<QueueKind, Icon> = { idea: Lightbulb, issue: CircleDot, poll: Vote };

const emptyCopy: Record<QueueKind, string> = {
  idea: 'Changes to the trip show up here as soon as someone starts an idea.',
  issue: 'Open questions and to-dos show up here as soon as someone raises one.',
  poll: 'Polls show up here as soon as someone asks the group.'
};

/** Names what is empty after the search or filters, so the empty state says why. */
function emptyHeadline({
  filtered,
  kind,
  query
}: {
  filtered: boolean;
  kind: QueueKind;
  query: string;
}) {
  if (filtered) return `No ${queueCopy[kind].plural} match ${query.trim()}`;
  if (query.trim()) return `No matches for “${query.trim()}”`;
  return `No ${queueCopy[kind].plural} yet`;
}

function emptyDescription({
  filtered,
  kind,
  query
}: {
  filtered: boolean;
  kind: QueueKind;
  query: string;
}) {
  if (filtered) return 'Remove a filter, or clear the search.';
  if (query.trim()) return 'Try another title, or clear the search.';
  return emptyCopy[kind];
}

/** One kind's rows, grouped by turn and settled state, or its loading and empty states. */
export function QueueList({
  addRow,
  archived,
  emptyAction,
  filtered = false,
  groups,
  isLoading,
  items,
  kind,
  ledger,
  selectableIds,
  query
}: {
  /** The inline add line that closes the ledger, when the viewer may add. */
  addRow?: ReactNode;
  archived: boolean;
  /** The way forward from an empty open queue: start something. */
  emptyAction?: ReactNode;
  /** Whether `key:value` filters narrow the list. */
  filtered?: boolean;
  groups: readonly QueueGroup[];
  isLoading: boolean;
  items: readonly QueueItem[];
  kind: QueueKind;
  ledger: QueueLedgerState;
  /** Issues the viewer may select; empty when nothing is selectable. */
  selectableIds: ReadonlySet<string>;
  query: string;
}) {
  if (isLoading) {
    return (
      <List.Body>
        <PageLoading label="Loading queue…" />
      </List.Body>
    );
  }
  if (items.length === 0) {
    return (
      <List.Body>
        <List.Empty
          buttonRaw={query.trim() || filtered ? undefined : emptyAction}
          description={emptyDescription({ filtered, kind, query })}
          headline={emptyHeadline({ filtered, kind, query })}
          icon={emptyIcon[kind]}
        />
      </List.Body>
    );
  }
  const renderGroup = (group: QueueGroup) => (
    <List.Group
      aria-label={queueCopy[kind].plural}
      collapsed={group.label !== null && ledger.collapsed.has(groupId(group.label))}
      count={group.items.length}
      key={groupId(group.label)}
      label={group.label}
      onToggle={
        group.label && ledger.foldable ? () => ledger.toggleGroup(groupId(group.label)) : undefined
      }
    >
      {group.items.map((item) => (
        <QueueRow
          archived={archived}
          item={item}
          key={`${item.kind}:${item.id}`}
          ledger={{
            anySelected: ledger.selected.size > 0,
            cursor: ledger.cursor === item.id,
            expanded: ledger.expanded.has(item.id),
            onCursor: () => ledger.setCursor(item.id),
            onToggleExpanded: () => ledger.toggleExpanded(item.id),
            ...(selectableIds.has(item.id)
              ? { onToggleSelect: () => ledger.toggleSelect(item.id) }
              : {}),
            selected: ledger.selected.has(item.id)
          }}
        />
      ))}
    </List.Group>
  );
  const settled = groups.filter((group) => groupId(group.label) === settledGroupId);
  // The add line closes the open groups; it sits above Settled so it never reads as one of its rows.
  return (
    <List.Body data-slot="queue-ledger">
      {groups.filter((group) => groupId(group.label) !== settledGroupId).map(renderGroup)}
      {addRow}
      {settled.map(renderGroup)}
    </List.Body>
  );
}
