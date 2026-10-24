import type { Active, DataRef, Over } from '@dnd-kit/core';

/** What dropping a card on a lane would do: nothing (its own lane), a move, or a refusal. */
export type KanbanDropDecision =
  | { label: string; outcome: 'allowed' }
  | { outcome: 'refused'; reason: string }
  | { outcome: 'same' };

/**
 * Everything the shared kanban needs to know about one board's cards and lanes: the lanes in
 * order and their names, how to name and place a card, and what a drop would do.
 */
export type KanbanModel<Item, Lane extends string> = {
  decide: (item: Item, lane: Lane) => KanbanDropDecision;
  itemId: (item: Item) => string;
  itemLane: (item: Item) => Lane;
  itemTitle: (item: Item) => string;
  laneTitle: (lane: Lane) => string;
  lanes: readonly Lane[];
};

/** A dnd-kit node, active or over, whose data the kanban reads. */
export type KanbanDragNode = { data: DataRef } | Active | Over;
