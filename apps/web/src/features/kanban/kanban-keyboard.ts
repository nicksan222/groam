import { KeyboardCode, type KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { KanbanModel } from '@/types/kanban';
import { kanbanLaneId, readKanbanItem } from './kanban-drag-data';

/** How far below the top of a lane the lifted card lands. */
const LANE_INSET = 8;

const hops: Record<string, number> = { [KeyboardCode.Left]: -1, [KeyboardCode.Right]: 1 };

/**
 * Left and right hop the lifted card to the neighbouring lane, centred under its header. The lane
 * it is in now comes from where the sensor last put it (not from the render that may lag a key
 * press behind), so quick presses keep walking. Lanes not on screen are skipped.
 */
export function kanbanKeyboardCoordinates<Item, Lane extends string>(
  model: KanbanModel<Item, Lane>
): KeyboardCoordinateGetter {
  return (event, { context, currentCoordinates }) => {
    const item = readKanbanItem<Item>(context.active);
    const { collisionRect } = context;
    const hop = hops[event.code];
    if (!item || !collisionRect || hop === undefined) return undefined;
    event.preventDefault();
    const shown = model.lanes.filter((lane) => context.droppableRects.has(kanbanLaneId(lane)));
    const centreX = currentCoordinates.x + collisionRect.width / 2;
    const here =
      shown.find((lane) => {
        const rect = context.droppableRects.get(kanbanLaneId(lane));
        return rect && centreX >= rect.left && centreX <= rect.right;
      }) ?? model.itemLane(item);
    const next = shown[shown.indexOf(here) + hop];
    const laneRect = next ? context.droppableRects.get(kanbanLaneId(next)) : undefined;
    if (!laneRect) return undefined;
    return {
      x: laneRect.left + (laneRect.width - collisionRect.width) / 2,
      y: laneRect.top + LANE_INSET
    };
  };
}
