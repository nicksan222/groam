import type { ReactNode } from 'react';
import type { TripBoardDragItem } from '@/types/trip-board';
import { isDraggable } from './trip-board-moves';
import { TripBoardSortable } from './trip-board-sortable';

/** Wraps a card so it can be lifted when the rulebook lets this viewer lift it, and leaves it plain otherwise. */
export function TripBoardCardSlot({
  children,
  item
}: {
  children: ReactNode;
  item: TripBoardDragItem;
}) {
  return isDraggable(item) ? (
    <TripBoardSortable item={item}>{children}</TripBoardSortable>
  ) : (
    <div>{children}</div>
  );
}
