import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import type { IssueStatus } from '@/types/issues';
import type { TripBoardIssue, TripBoardIssueItem } from '@/types/trip-board';
import { TripBoardCardSlot } from './trip-board-card-slot';
import { useTripBoardContext } from './trip-board-context';
import { useTripBoardDrag } from './trip-board-drag-state';
import { TripBoardIssueCard } from './trip-board-issue-card';
import { TripBoardLane } from './trip-board-lane';
import { decideTransfer, isDraggable } from './trip-board-moves';

/** Where a card from another lane would land, shown as an empty slot. */
function Slot() {
  return (
    <div
      aria-hidden="true"
      className="h-14 shrink-0 rounded-lg border border-dashed border-primary/40 bg-primary/5"
    />
  );
}

/**
 * One of the four issue lanes: its issues in rank order, each lifted and reordered in place, with
 * a slot opening where a card from another lane would land. Won't do is the quiet one.
 */
export function TripBoardIssueLane({
  empty,
  footer,
  issues,
  meta,
  status
}: {
  empty: ReactNode;
  footer?: ReactNode;
  issues: TripBoardIssue[] | undefined;
  meta?: ReactNode;
  status: IssueStatus;
}) {
  const { links, rights } = useTripBoardContext();
  const { item, target } = useTripBoardDrag();
  const quiet = status === 'wont_do';
  const lifts = (issues ?? []).map((issue): TripBoardIssueItem => ({
    ...rights,
    issue,
    kind: 'issue',
    link: links.get(issue.id)
  }));
  const draggableIds = lifts.filter(isDraggable).map(({ issue }) => issue.id);
  const slotIndex =
    item && target?.lane === status && decideTransfer(item, status).outcome === 'allowed'
      ? target.index
      : null;
  const cards: ReactNode[] = lifts.map((lift) => (
    <TripBoardCardSlot item={lift} key={lift.issue.id}>
      <TripBoardIssueCard issue={lift.issue} link={lift.link} quiet={quiet} />
    </TripBoardCardSlot>
  ));
  if (slotIndex !== null) cards.splice(slotIndex, 0, <Slot key="slot" />);

  return (
    <TripBoardLane
      count={issues?.length}
      empty={slotIndex === null ? empty : undefined}
      footer={footer}
      lane={status}
      meta={meta}
      quiet={quiet}
    >
      <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
        {cards}
      </SortableContext>
    </TripBoardLane>
  );
}
