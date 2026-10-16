import { type PointerEvent, type RefObject, useRef, useState } from 'react';
import {
  exceedsPanThreshold,
  panScrollLeft,
  startsOnEmptySpace
} from '@/features/trips/trip-board/trip-board-pan';

/**
 * Lets a mouse pan a horizontal scroller by dragging its empty space. Touch keeps the browser's
 * own swipe, and presses on cards or controls are left to them. `disabled` stands down while a
 * card is being carried. A pan captures the pointer, so the click that ends it lands nowhere.
 */
export function useTripBoardPan(scroller: RefObject<HTMLElement | null>, disabled: boolean) {
  const press = useRef<{
    moved: boolean;
    pointerId: number;
    scrollLeft: number;
    x: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const node = scroller.current;
    if (
      disabled ||
      !node ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      !startsOnEmptySpace(event.target)
    ) {
      return;
    }
    press.current = {
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: node.scrollLeft,
      x: event.clientX
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const node = scroller.current;
    const current = press.current;
    if (!node || !current || event.pointerId !== current.pointerId) return;
    if (!current.moved) {
      if (!exceedsPanThreshold(event.clientX - current.x)) return;
      current.moved = true;
      node.setPointerCapture(event.pointerId);
      setPanning(true);
    }
    node.scrollLeft = panScrollLeft(current.scrollLeft, current.x, event.clientX);
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || event.pointerId !== current.pointerId) return;
    press.current = null;
    if (current.moved) scroller.current?.releasePointerCapture(event.pointerId);
    setPanning(false);
  };

  return {
    handlers: {
      onPointerCancel: onPointerEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd
    },
    panning
  };
}
