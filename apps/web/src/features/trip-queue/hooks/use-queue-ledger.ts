import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { groupId, settledGroupId } from '@/features/trip-queue/queue-groups';
import type { QueueGroup } from '@/types/queue';
import { useQueueKeys } from './use-queue-keys';

const rowSelector = (id: string) => `[data-row-id="${CSS.escape(id)}"]`;

/**
 * The ledger's keyboard cursor, row selection, and folded groups. The cursor walks the rows that
 * show (folded groups skipped) and takes real focus, so screen readers follow it; selection only
 * ever holds issues that can be selected and are on show (not in a folded group). Groups are folded
 * by id (`groupId`), never by label. Nothing stays folded while `searching`, nor when the settled
 * group is all there is, so a search never hides its own matches; then `foldable` is false, the
 * headers are not toggles, and `toggleGroup` leaves the stored fold state alone.
 */
export function useQueueLedger({
  addable,
  folded = [],
  groups,
  searching = false,
  selectableIds
}: {
  /** Whether C may focus the add-question input. */
  addable: boolean;
  /** Group ids that start folded. */
  folded?: readonly string[];
  groups: readonly QueueGroup[];
  /** A search or filter is active: show every group unfolded. */
  searching?: boolean;
  selectableIds: ReadonlySet<string>;
}) {
  const [foldedIds, setFoldedIds] = useState<ReadonlySet<string>>(() => new Set(folded));
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  // Kept here, not in the row: a vote moves a poll to another group, which remounts its row.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const focusCursor = useRef(false);

  const onlySettled = groups.length === 1 && groupId(groups[0]?.label ?? null) === settledGroupId;
  const foldable = !searching && !onlySettled;
  const collapsed = useMemo<ReadonlySet<string>>(
    () => (foldable ? foldedIds : new Set()),
    [foldable, foldedIds]
  );
  const rowIds = useMemo(
    () =>
      groups
        .filter((group) => !(group.label !== null && collapsed.has(groupId(group.label))))
        .flatMap((group) => group.items.map((item) => item.id)),
    [collapsed, groups]
  );
  const cursor = cursorId !== null && rowIds.includes(cursorId) ? cursorId : null;
  const selected = useMemo(() => {
    const shown = new Set(rowIds);
    return new Set([...picked].filter((id) => shown.has(id) && selectableIds.has(id)));
  }, [picked, rowIds, selectableIds]);

  useEffect(() => {
    if (cursor === null || !focusCursor.current) return;
    focusCursor.current = false;
    const row = document.querySelector(rowSelector(cursor));
    row?.querySelector<HTMLElement>('[data-slot="queue-title"]')?.focus();
    row?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const move = useCallback(
    (step: -1 | 1) => {
      if (rowIds.length === 0) return;
      const index = cursor === null ? -1 : rowIds.indexOf(cursor);
      const next = index === -1 ? (step > 0 ? 0 : rowIds.length - 1) : index + step;
      focusCursor.current = true;
      setCursorId(rowIds[Math.min(Math.max(next, 0), rowIds.length - 1)] ?? null);
    },
    [cursor, rowIds]
  );
  const toggleSelect = useCallback(
    (id: string) => {
      if (!selectableIds.has(id)) return;
      setPicked((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    },
    [selectableIds]
  );
  const clearSelection = useCallback(() => setPicked(new Set()), []);
  const deselect = useCallback((ids: readonly string[]) => {
    const drop = new Set(ids);
    setPicked((current) => new Set([...current].filter((id) => !drop.has(id))));
  }, []);
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);
  const toggleGroup = useCallback(
    (id: string) => {
      if (!foldable) return;
      setFoldedIds((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    },
    [foldable]
  );

  useQueueKeys({
    addable,
    clearSelection,
    cursor,
    move,
    selectable: selectableIds.size > 0,
    selectedCount: selected.size,
    toggleSelect
  });

  return {
    clearSelection,
    collapsed,
    cursor,
    deselect,
    expanded,
    foldable,
    selected,
    setCursor: setCursorId,
    toggleExpanded,
    toggleGroup,
    toggleSelect
  };
}
