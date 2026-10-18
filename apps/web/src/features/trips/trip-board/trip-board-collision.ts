import { type CollisionDetection, closestCenter } from '@dnd-kit/core';
import { isCardNode, readLane } from './trip-board-drag-data';
import { centre, contains } from './trip-board-geometry';

/**
 * The lane under the lifted card's centre (or the nearest one sideways), then the closest card in
 * that lane, or the bare lane when it has none. Works the same for pointer and keyboard.
 */
export const tripBoardCollision: CollisionDetection = (args) => {
  const { collisionRect, droppableContainers, droppableRects } = args;
  const point = centre(collisionRect);
  const lanes = droppableContainers.filter((container) => !isCardNode(container));
  const [nearest] = closestCenter({ ...args, droppableContainers: lanes });
  const lane =
    lanes.find(({ id }) => {
      const rect = droppableRects.get(id);
      return rect && contains(rect, point);
    }) ?? lanes.find(({ id }) => id === nearest?.id);
  if (!lane) return [];
  const laneId = readLane(lane);
  const cards = droppableContainers.filter(
    (container) => isCardNode(container) && readLane(container) === laneId
  );
  const [nearestCard] = closestCenter({ ...args, droppableContainers: cards });
  return [nearestCard ?? { id: lane.id }];
};
