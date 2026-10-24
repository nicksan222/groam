import type { KanbanDragNode } from '@/types/kanban';

export const kanbanLaneId = (lane: string) => `lane:${lane}`;

export const kanbanLaneData = (lane: string) => ({ kanbanLane: lane });

export const kanbanCardData = (item: unknown) => ({ kanbanItem: item });

/** The lane a droppable stands for, if it is one of `lanes`. */
export function readKanbanLane<Lane extends string>(
  node: KanbanDragNode | null | undefined,
  lanes: readonly Lane[]
): Lane | null {
  const lane: unknown = node?.data.current?.kanbanLane;
  return lanes.find((key) => key === lane) ?? null;
}

/** The card a draggable carries. */
export function readKanbanItem<Item>(node: KanbanDragNode | null | undefined): Item | null {
  const item: unknown = node?.data.current?.kanbanItem;
  return item === undefined || item === null ? null : (item as Item);
}
