import { useDroppable } from '@dnd-kit/core';
import { kanbanLaneData, kanbanLaneId, readKanbanItem } from './kanban-drag-data';
import { useKanbanModel } from './kanban-model-context';

/**
 * Makes a lane a drop target and says what the lifted card (if any) would do here. Everything
 * comes from dnd-kit's own state: the card is read fresh from the active draggable.
 */
export function useKanbanLaneDrop<Item, Lane extends string>(lane: Lane) {
  const model = useKanbanModel<Item, Lane>();
  const { active, isOver, setNodeRef } = useDroppable({
    data: kanbanLaneData(lane),
    id: kanbanLaneId(lane)
  });
  const item = readKanbanItem<Item>(active);
  return { decision: item ? model.decide(item, lane) : null, hovered: isOver, setNodeRef };
}
