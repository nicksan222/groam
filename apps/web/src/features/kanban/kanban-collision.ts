import { type CollisionDetection, pointerWithin } from '@dnd-kit/core';

/**
 * The lane under the lifted card, and nothing when it is over none, so a drop outside every lane
 * cancels instead of landing in the nearest one. The mouse uses the pointer; the keyboard has no
 * pointer, so it uses the centre of the lifted card.
 */
export const kanbanCollision: CollisionDetection = (args) => {
  if (args.pointerCoordinates) return pointerWithin(args);
  const { collisionRect, droppableContainers, droppableRects } = args;
  const x = collisionRect.left + collisionRect.width / 2;
  const y = collisionRect.top + collisionRect.height / 2;
  const under = droppableContainers.find(({ id }) => {
    const rect = droppableRects.get(id);
    return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
  return under ? [{ id: under.id }] : [];
};
