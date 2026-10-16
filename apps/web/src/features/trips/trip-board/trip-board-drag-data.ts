import type {
  TripBoardDndNode,
  TripBoardDragData,
  TripBoardDragItem,
  TripBoardLane
} from '@/types/trip-board';
import { itemLane } from './trip-board-moves';

export const laneDroppableId = (lane: TripBoardLane) => `lane:${lane}`;

export const laneData = (lane: TripBoardLane): TripBoardDragData => ({ lane, type: 'lane' });

export const cardData = (item: TripBoardDragItem): TripBoardDragData => ({ item, type: 'card' });

const isDragData = (value: unknown): value is TripBoardDragData =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value.type === 'card' || value.type === 'lane');

const read = (node: TripBoardDndNode | null | undefined) => {
  const data = node?.data.current;
  return isDragData(data) ? data : undefined;
};

export const isCardNode = (node: TripBoardDndNode) => read(node)?.type === 'card';

/** The card a draggable carries. */
export function readItem(node: TripBoardDndNode | null | undefined): TripBoardDragItem | null {
  const data = read(node);
  return data?.type === 'card' ? data.item : null;
}

/** The lane a droppable belongs to, whether it is the lane itself or one of its cards. */
export function readLane(node: TripBoardDndNode | null | undefined): TripBoardLane | null {
  const data = read(node);
  if (!data) return null;
  return data.type === 'lane' ? data.lane : itemLane(data.item);
}
