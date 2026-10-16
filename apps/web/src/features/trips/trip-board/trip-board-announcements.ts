import type { Announcements } from '@dnd-kit/core';
import type { TripBoardDndNode, TripBoardDropDecision } from '@/types/trip-board';
import { readItem, readLane } from './trip-board-drag-data';
import { tripBoardLanes } from './trip-board-lanes';
import { decideMove, itemLane, itemTitle } from './trip-board-moves';

export const tripBoardInstructions =
  'To pick up a card, press Space. Use the left and right arrow keys to move between columns and the up and down arrow keys to move within one, then press Space to drop it or Escape to cancel.';

const sentence = (text: string) => (/[.!?]$/u.test(text) ? text : `${text}.`);

function say(decision: TripBoardDropDecision | null) {
  if (decision?.outcome === 'allowed') return sentence(decision.move.label);
  if (decision?.outcome === 'refused') return sentence(decision.reason);
  return null;
}

/** What the rulebook says about the card `active` over `over`, ready to put into a sentence. */
function consult(active: TripBoardDndNode, over: TripBoardDndNode | null) {
  const item = readItem(active);
  if (!item) return null;
  const lane = readLane(over);
  const decision = lane ? decideMove(item, lane) : null;
  return { item, lane, outcome: decision?.outcome, text: say(decision), title: itemTitle(item) };
}

function describeTarget(active: TripBoardDndNode, over: TripBoardDndNode | null) {
  const advice = consult(active, over);
  if (!advice) return '';
  const { item, lane, text, title } = advice;
  if (!lane) return `${title} is not over a column.`;
  const name = tripBoardLanes[lane].title;
  if (text) return `${title} is over ${name}. ${text}`;
  return itemLane(item) === lane
    ? `${title} is in ${name}.`
    : `${title} can’t be dropped in ${name}.`;
}

function describeDrop(active: TripBoardDndNode, over: TripBoardDndNode | null) {
  const advice = consult(active, over);
  if (!advice) return '';
  const { outcome, text, title } = advice;
  if (!text) return `${title} stays where it was.`;
  return outcome === 'allowed' ? `Dropped ${title}. ${text}` : `${title} not moved. ${text}`;
}

export const tripBoardAnnouncements: Announcements = {
  onDragCancel: ({ active }) => describeDrop(active, null),
  onDragEnd: ({ active, over }) => describeDrop(active, over),
  onDragOver: ({ active, over }) => describeTarget(active, over),
  onDragStart: ({ active }) => {
    const item = readItem(active);
    return item ? `Picked up ${itemTitle(item)}. Use the arrow keys to choose a place.` : '';
  }
};
