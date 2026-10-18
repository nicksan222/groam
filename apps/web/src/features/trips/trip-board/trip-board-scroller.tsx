import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, useRef } from 'react';
import { useTripBoardPan } from '@/features/trips/hooks/use-trip-board-pan';
import { testIds } from '@/lib/test-ids';
import type { TripBoardLaneCounts } from '@/types/trip-board';
import { useTripBoardDrag } from './trip-board-drag-state';
import { TripBoardLaneTabs } from './trip-board-lane-tabs';

/**
 * The horizontal lane scroller, filling the height it is given so each lane scrolls its own cards.
 * A mouse pans it by dragging empty space, touch swipes it natively, and it takes focus so the
 * arrow keys scroll it. Its side padding lines the first lane up with the page header. A spacer
 * closes the track so the last lane scrolls fully clear of the right edge.
 */
export function TripBoardScroller({
  children,
  counts
}: {
  children: ReactNode;
  counts: TripBoardLaneCounts;
}) {
  const scroller = useRef<HTMLElement>(null);
  const { item } = useTripBoardDrag();
  const { handlers, panning } = useTripBoardPan(scroller, item !== null);
  return (
    <>
      <TripBoardLaneTabs counts={counts} scroller={scroller} />
      <section
        {...handlers}
        aria-label="Trip board lanes"
        className={cn(
          'flex min-h-0 min-w-0 flex-1 touch-pan-x touch-pan-y snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:scroll-px-6 sm:gap-3 sm:px-6 sm:pt-4 sm:pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:snap-none sm:items-stretch',
          panning ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
        data-testid={testIds.tripBoardScroller}
        ref={scroller}
        // A scrolling region has to take focus, or keyboard users cannot reach the lanes beyond the edge.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {children}
        <div aria-hidden="true" className="w-3 shrink-0" />
      </section>
    </>
  );
}
