import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, prefersReducedMotion } from '@groam/ui/lib/utils';
import { type ReactNode, useCallback } from 'react';
import { testIds } from '@/lib/test-ids';
import type { TripBoardDragItem } from '@/types/trip-board';
import { cardData } from './trip-board-drag-data';
import { itemId } from './trip-board-moves';

/**
 * Makes a card liftable by pointer, touch, or keyboard and lets its lane reorder around it. The
 * wrapper is the keyboard handle, a group rather than a button so Enter and Space inside the
 * card's own links and buttons keep working.
 */
export function TripBoardSortable({
  children,
  item
}: {
  children: ReactNode;
  item: TripBoardDragItem;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    attributes: { role: 'group', roleDescription: 'draggable card' },
    data: cardData(item),
    id: itemId(item),
    ...(prefersReducedMotion() ? { transition: null } : {})
  });
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef, setNodeRef]
  );
  return (
    <div
      {...attributes}
      {...listeners}
      className={cn(
        'group/drag relative cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring [&_a]:cursor-grab',
        // The card's own place while it is lifted: a quiet hollow of the same height.
        isDragging && 'bg-muted/40 outline-1 outline-border outline-dashed'
      )}
      data-card-id={itemId(item)}
      data-testid={testIds.tripBoardDraggable}
      ref={ref}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className={cn(isDragging && 'invisible')}>{children}</div>
    </div>
  );
}
