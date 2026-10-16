import {
  DndContext,
  type DragMoveEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { prefersReducedMotion } from '@groam/ui/lib/utils';
import { type ReactNode, useState } from 'react';
import type {
  TripBoardDragItem,
  TripBoardDragState,
  TripBoardDropTarget,
  TripBoardLane
} from '@/types/trip-board';
import { tripBoardAnnouncements, tripBoardInstructions } from './trip-board-announcements';
import { tripBoardCollision } from './trip-board-collision';
import { isCardNode, readItem, readLane } from './trip-board-drag-data';
import { TripBoardDragPreview } from './trip-board-drag-preview';
import { TripBoardDragContext, idleDrag } from './trip-board-drag-state';
import { isBelow } from './trip-board-geometry';
import { tripBoardKeyboardCoordinates } from './trip-board-keyboard';
import { locateDrop } from './trip-board-order';

const dropAnimation = { duration: 180, easing: 'ease-out' };

const sameTarget = (a: TripBoardDropTarget | null, b: TripBoardDropTarget | null) =>
  a?.lane === b?.lane && a?.index === b?.index && a?.unchanged === b?.unchanged;

/** Drag and drop for the board: mouse, touch with a press delay, and keyboard moves. */
export function TripBoardDnd({
  children,
  onDrop,
  order = {}
}: {
  children: ReactNode;
  onDrop: (item: TripBoardDragItem, target: TripBoardDropTarget) => void;
  /** The cards of each lane top to bottom, so a drop can name its neighbours. */
  order?: Partial<Record<TripBoardLane, readonly Id<'tripIssues'>[]>>;
}) {
  const [drag, setDrag] = useState<TripBoardDragState>(idleDrag);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: tripBoardKeyboardCoordinates,
      // Jump instead of gliding: the lane under the card is settled the moment the key is handled.
      scrollBehavior: 'auto'
    })
  );

  const locate = ({ active, over }: Pick<DragMoveEvent, 'active' | 'over'>) => {
    const lane = readLane(over);
    if (!over || !lane) return null;
    const moved = active.rect.current.translated;
    return locateDrop({
      activeId: String(active.id),
      below: moved ? isBelow(moved, over.rect) : false,
      lane,
      laneIds: order[lane] ?? [],
      overId: isCardNode(over) ? String(over.id) : null
    });
  };

  const track = (event: Pick<DragMoveEvent, 'active' | 'over'>) => {
    const target = locate(event);
    setDrag((prev) => (sameTarget(prev.target, target) ? prev : { ...prev, target }));
  };

  return (
    <DndContext
      accessibility={{
        announcements: tripBoardAnnouncements,
        screenReaderInstructions: { draggable: tripBoardInstructions }
      }}
      collisionDetection={tripBoardCollision}
      onDragCancel={() => setDrag(idleDrag)}
      onDragEnd={(event) => {
        const item = readItem(event.active);
        const landing = locate(event);
        setDrag(idleDrag);
        if (item && landing) onDrop(item, landing);
      }}
      onDragMove={track}
      onDragOver={track}
      onDragStart={({ active }) => setDrag({ item: readItem(active), target: null })}
      sensors={sensors}
    >
      <TripBoardDragContext.Provider value={drag}>{children}</TripBoardDragContext.Provider>
      <DragOverlay dropAnimation={prefersReducedMotion() ? null : dropAnimation}>
        {drag.item ? <TripBoardDragPreview item={drag.item} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
