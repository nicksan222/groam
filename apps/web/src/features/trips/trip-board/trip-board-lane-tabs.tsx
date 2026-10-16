import { Button } from '@groam/ui/components/button';
import { type RefObject, useEffect, useRef } from 'react';
import { useTripBoardActiveLane } from '@/features/trips/hooks/use-trip-board-active-lane';
import { testIds } from '@/lib/test-ids';
import type { TripBoardLaneCounts } from '@/types/trip-board';
import { tripBoardLaneOrder, tripBoardLanes } from './trip-board-lanes';

/**
 * Phone-only lane switcher: one pill per lane with its count. The pill of the lane in view is
 * highlighted and kept in sight; tapping one scrolls that lane to the middle.
 */
export function TripBoardLaneTabs({
  counts,
  scroller
}: {
  counts: TripBoardLaneCounts;
  scroller: RefObject<HTMLElement | null>;
}) {
  const { active, show } = useTripBoardActiveLane(scroller);
  const row = useRef<HTMLElement>(null);

  useEffect(() => {
    const tab = row.current?.querySelector<HTMLElement>('[aria-current="true"]');
    row.current?.scrollTo({
      left: tab ? tab.offsetLeft - (row.current.clientWidth - tab.offsetWidth) / 2 : 0
    });
  }, [active]);

  return (
    <nav
      aria-label="Lanes"
      className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto bg-background px-4 py-2 sm:hidden"
      ref={row}
    >
      {tripBoardLaneOrder.map((lane) => (
        <Button
          aria-current={active === lane}
          className="group/tab shrink-0 rounded-full border border-transparent aria-[current=true]:border-border aria-[current=true]:font-semibold"
          data-lane-tab={lane}
          data-testid={testIds.tripBoardLaneTab}
          key={lane}
          onClick={() => show(lane)}
          size="sm"
          variant={active === lane ? 'secondary' : 'ghost'}
        >
          {tripBoardLanes[lane].title}
          <span className="tabular-nums text-muted-foreground group-aria-[current=true]/tab:text-foreground/70">
            {counts[lane] ?? '…'}
          </span>
        </Button>
      ))}
    </nav>
  );
}
