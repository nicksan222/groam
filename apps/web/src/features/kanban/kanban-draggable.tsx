import { useDraggable } from '@dnd-kit/core';
import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { kanbanCardData } from './kanban-drag-data';
import { useKanbanModel } from './kanban-model-context';

/**
 * Lets a card be lifted: with the mouse after a few pixels, or with Space when the card has focus
 * (not when a link or button inside it has). A disabled card (read-only, or on a phone) is plain.
 *
 * The card is a focus stop of its own, ahead of the controls inside it, so a keyboard user tabs
 * card, then its controls. The click that ends a mouse drag, released over the card's own faded
 * original, is swallowed so it cannot reach a control inside it.
 */
export function KanbanDraggable<Item>({
  children,
  className,
  disabled,
  item,
  testId
}: {
  children: ReactNode;
  className?: string;
  disabled: boolean;
  item: Item;
  testId?: string;
}) {
  const model = useKanbanModel<Item, string>();
  const id = model.itemId(item);
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef } = useDraggable({
    data: kanbanCardData(item),
    disabled,
    id
  });
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef, setNodeRef]
  );
  // True while a drag runs and for one frame after it ends or is cancelled.
  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) {
      dragged.current = true;
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      dragged.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [isDragging]);
  if (disabled) {
    return (
      <div className={className} data-item-id={id}>
        {children}
      </div>
    );
  }
  // The card holds controls of its own, so it is a labelled group, not a button.
  const { 'aria-pressed': _pressed, role: _role, ...lifting } = attributes;
  return (
    <div
      {...lifting}
      {...listeners}
      aria-label={model.itemTitle(item)}
      className={cn(
        'cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
        isDragging && 'opacity-40',
        className
      )}
      data-dragging={isDragging || undefined}
      data-item-id={id}
      data-testid={testId}
      onClickCapture={(event) => {
        if (!dragged.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      ref={ref}
      role="group"
    >
      {children}
    </div>
  );
}
