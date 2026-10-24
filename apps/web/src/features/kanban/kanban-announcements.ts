import type { Announcements } from '@dnd-kit/core';
import type { KanbanDragNode, KanbanModel } from '@/types/kanban';
import { readKanbanItem, readKanbanLane } from './kanban-drag-data';

export const kanbanInstructions =
  'To pick up a card, press Space. Use the left and right arrow keys to move between lanes, then press Space to drop it or Escape to cancel.';

const sentence = (text: string) => (/[.!?]$/u.test(text) ? text : `${text}.`);

/** What screen readers hear while a card is lifted, moved over lanes, and dropped. */
export function kanbanAnnouncements<Item, Lane extends string>(
  model: KanbanModel<Item, Lane>
): Announcements {
  const consult = (active: KanbanDragNode, over: KanbanDragNode | null) => {
    const item = readKanbanItem<Item>(active);
    if (!item) return null;
    const lane = readKanbanLane(over, model.lanes);
    return { decision: lane ? model.decide(item, lane) : null, item, lane };
  };

  const describeTarget = (active: KanbanDragNode, over: KanbanDragNode | null) => {
    const advice = consult(active, over);
    if (!advice) return '';
    const { decision, item, lane } = advice;
    const title = model.itemTitle(item);
    if (!lane || !decision) return `${title} is not over a lane.`;
    const name = model.laneTitle(lane);
    if (decision.outcome === 'allowed') {
      return `${title} is over ${name}. ${sentence(decision.label)}`;
    }
    if (decision.outcome === 'refused') {
      return `${title} is over ${name}. Can’t drop here. ${sentence(decision.reason)}`;
    }
    return `${title} is in ${model.laneTitle(model.itemLane(item))}.`;
  };

  const describeDrop = (active: KanbanDragNode, over: KanbanDragNode | null) => {
    const advice = consult(active, over);
    if (!advice) return '';
    const { decision, item } = advice;
    const title = model.itemTitle(item);
    if (decision?.outcome === 'allowed') return `Dropped ${title}. ${sentence(decision.label)}`;
    if (decision?.outcome === 'refused') return `${title} not moved. ${sentence(decision.reason)}`;
    return `${title} stays where it was.`;
  };

  return {
    onDragCancel: ({ active }) => describeDrop(active, null),
    onDragEnd: ({ active, over }) => describeDrop(active, over),
    onDragOver: ({ active, over }) => describeTarget(active, over),
    onDragStart: ({ active }) => {
      const item = readKanbanItem<Item>(active);
      return item
        ? `Picked up ${model.itemTitle(item)}. Use the left and right arrow keys to choose a lane.`
        : '';
    }
  };
}
