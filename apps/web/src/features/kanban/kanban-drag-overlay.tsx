import { DragOverlay, useDndContext } from '@dnd-kit/core';
import { prefersReducedMotion } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { readKanbanItem } from './kanban-drag-data';

const dropAnimation = { duration: 180, easing: 'ease-out' };

/**
 * The lifted copy that follows the pointer, built from the card dnd-kit says is active. It is
 * inert and hidden from assistive technology: the original card stays the one that is announced.
 */
export function KanbanDragOverlay<Item>({ preview }: { preview: (item: Item) => ReactNode }) {
  const item = readKanbanItem<Item>(useDndContext().active);
  return (
    <DragOverlay dropAnimation={prefersReducedMotion() ? null : dropAnimation}>
      {item ? (
        <div aria-hidden data-kanban-preview inert>
          {preview(item)}
        </div>
      ) : null}
    </DragOverlay>
  );
}
