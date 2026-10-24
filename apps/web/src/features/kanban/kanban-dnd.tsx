import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { type ReactNode, useMemo } from 'react';
import type { KanbanModel } from '@/types/kanban';
import { kanbanAnnouncements, kanbanInstructions } from './kanban-announcements';
import { kanbanCollision } from './kanban-collision';
import { readKanbanItem, readKanbanLane } from './kanban-drag-data';
import { KanbanDragOverlay } from './kanban-drag-overlay';
import { kanbanKeyboardCoordinates } from './kanban-keyboard';
import { KanbanModelContext } from './kanban-model-context';

/**
 * Drag and drop between a kanban's lanes: a mouse (a fine pointer) after a few pixels of travel,
 * and the keyboard (Space lifts, Left and Right hop lanes, Space drops, Escape cancels). There is
 * no touch sensor: a touch screen moves cards through their menus. `onDrop` hears of every drop
 * the model allows, and whether it came from the keyboard.
 */
export function KanbanDnd<Item, Lane extends string>({
  children,
  model,
  onDrop,
  preview
}: {
  children: ReactNode;
  model: KanbanModel<Item, Lane>;
  onDrop: (item: Item, lane: Lane, source: { keyboard: boolean }) => void;
  /** The lifted copy that follows the pointer. */
  preview: (item: Item) => ReactNode;
}) {
  const coordinateGetter = useMemo(() => kanbanKeyboardCoordinates(model), [model]);
  const announcements = useMemo(() => kanbanAnnouncements(model), [model]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: {
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
        start: [KeyboardCode.Space]
      },
      // Jump instead of gliding: the lane under the card is settled the moment the key is handled.
      scrollBehavior: 'auto'
    })
  );
  return (
    <KanbanModelContext.Provider value={model as unknown as KanbanModel<unknown, string>}>
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: kanbanInstructions }
        }}
        collisionDetection={kanbanCollision}
        onDragEnd={({ active, activatorEvent, over }) => {
          const item = readKanbanItem<Item>(active);
          const lane = readKanbanLane(over, model.lanes);
          if (item && lane && model.decide(item, lane).outcome === 'allowed') {
            onDrop(item, lane, { keyboard: activatorEvent instanceof KeyboardEvent });
          }
        }}
        sensors={sensors}
      >
        {children}
        <KanbanDragOverlay preview={preview} />
      </DndContext>
    </KanbanModelContext.Provider>
  );
}
