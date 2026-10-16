import { motionSafeScrollBehavior } from '@groam/ui/lib/utils';
import { type RefObject, useEffect, useState } from 'react';
import { tripBoardLaneOrder } from '@/features/trips/trip-board/trip-board-lanes';
import type { TripBoardLane } from '@/types/trip-board';

const lanesIn = (scroller: HTMLElement) =>
  Array.from(scroller.querySelectorAll<HTMLElement>('[data-lane]'));

/** Where a lane's left edge sits within the scroller's scrolled content. */
const contentLeft = (scroller: HTMLElement, lane: HTMLElement) =>
  lane.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;

/**
 * The lane closest to the middle of the scroller, kept current as it scrolls, and a way to scroll
 * a lane to the middle.
 */
export function useTripBoardActiveLane(scroller: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<TripBoardLane | null>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const measure = () => {
      const middle = node.scrollLeft + node.clientWidth / 2;
      const distance = (lane: HTMLElement) =>
        Math.abs(contentLeft(node, lane) + lane.offsetWidth / 2 - middle);
      const nearest = lanesIn(node).toSorted((a, b) => distance(a) - distance(b))[0];
      setActive(tripBoardLaneOrder.find((lane) => lane === nearest?.dataset.lane) ?? null);
    };
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    return () => node.removeEventListener('scroll', measure);
  }, [scroller]);

  const show = (lane: TripBoardLane) => {
    const node = scroller.current;
    const target = node && lanesIn(node).find((item) => item.dataset.lane === lane);
    if (!node || !target) return;
    node.scrollTo({
      behavior: motionSafeScrollBehavior(),
      left: contentLeft(node, target) - (node.clientWidth - target.offsetWidth) / 2
    });
  };

  return { active, show };
}
