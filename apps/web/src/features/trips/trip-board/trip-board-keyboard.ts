import {
  type ClientRect,
  type DroppableContainer,
  KeyboardCode,
  type KeyboardCoordinateGetter
} from '@dnd-kit/core';
import type { TripBoardKeyboardContext, TripBoardLane } from '@/types/trip-board';
import { isCardNode, laneDroppableId, readItem, readLane } from './trip-board-drag-data';
import { centre, isBelow } from './trip-board-geometry';
import { tripBoardLaneOrder } from './trip-board-lanes';
import { itemLane } from './trip-board-moves';

/** How far past a card's centre the lifted card sits to count as "after" it (or "before"). */
const NUDGE = 4;

/** How far below the top of an empty lane a card lands. */
const LANE_INSET = 8;

const hops: Record<string, number> = { [KeyboardCode.Left]: -1, [KeyboardCode.Right]: 1 };
const steps: Record<string, number> = { [KeyboardCode.Down]: 1, [KeyboardCode.Up]: -1 };

const cardsOf = (context: TripBoardKeyboardContext, lane: TripBoardLane): DroppableContainer[] =>
  context.droppableContainers
    .getEnabled()
    .filter((card) => isCardNode(card) && readLane(card) === lane)
    .toSorted(
      (a, b) =>
        (context.droppableRects.get(a.id)?.top ?? 0) - (context.droppableRects.get(b.id)?.top ?? 0)
    );

/** Centres the lifted card in the lane's column with its own centre at `centreY`. */
const place = (laneRect: ClientRect, lifted: ClientRect, centreY: number) => ({
  x: laneRect.left + (laneRect.width - lifted.width) / 2,
  y: centreY - lifted.height / 2
});

/** Left and right: the neighbouring lane, landing at its bottom (or its top when empty). */
function hopTo(
  context: TripBoardKeyboardContext,
  lane: TripBoardLane,
  hop: number,
  lifted: ClientRect
) {
  const next = tripBoardLaneOrder[tripBoardLaneOrder.indexOf(lane) + hop];
  const laneRect = next ? context.droppableRects.get(laneDroppableId(next)) : undefined;
  if (!next || !laneRect) return undefined;
  const last = cardsOf(context, next).at(-1);
  const lastRect = last ? context.droppableRects.get(last.id) : undefined;
  return place(
    laneRect,
    lifted,
    lastRect ? centre(lastRect).y + NUDGE : laneRect.top + LANE_INSET + lifted.height / 2
  );
}

/**
 * Up and down: one slot at a time through the lane's cards. Down from "before X" lands "after X";
 * down from "after X" moves on to the next card. Up mirrors it. The card's own place counts as
 * neither, so the first press always leaves it.
 */
function stepTo(
  context: TripBoardKeyboardContext,
  lane: TripBoardLane,
  step: number,
  lifted: ClientRect
) {
  const cards = cardsOf(context, lane);
  const laneRect = context.droppableRects.get(laneDroppableId(lane));
  const here = cards.findIndex((card) => card.id === context.over?.id);
  const hereRect = cards[here] ? context.droppableRects.get(cards[here].id) : undefined;
  if (!laneRect || !hereRect) return undefined;
  const below = isBelow(lifted, hereRect);
  const onSelf = context.over?.id === context.active?.id;
  const staysOnCard = !onSelf && (step === 1 ? !below : below);
  const target = cards[staysOnCard ? here : here + step];
  const targetRect = target ? context.droppableRects.get(target.id) : undefined;
  return targetRect ? place(laneRect, lifted, centre(targetRect).y + step * NUDGE) : undefined;
}

export const tripBoardKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const item = readItem(context.active);
  const { collisionRect } = context;
  if (!item || !collisionRect) return undefined;
  const lane = readLane(context.over) ?? itemLane(item);
  const hop = hops[event.code];
  if (hop !== undefined) {
    event.preventDefault();
    return hopTo(context, lane, hop, collisionRect);
  }
  const step = steps[event.code];
  if (step !== undefined) {
    event.preventDefault();
    return stepTo(context, lane, step, collisionRect);
  }
  return undefined;
};
