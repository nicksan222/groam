import type { TripBoardLane as Lane } from '@/types/trip-board';
import { tripBoardLanes } from './trip-board-lanes';

/** A lane's header: title with its count, and what the lane is for. */
export function TripBoardLaneHeader({
  count,
  headingId,
  lane
}: {
  count: number | undefined;
  headingId: string;
  lane: Lane;
}) {
  const { subtitle, title } = tripBoardLanes[lane];
  return (
    <header className="flex flex-col gap-0.5 px-3 pt-1 pb-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold" id={headingId}>
          {title}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span aria-hidden="true">{count ?? '…'}</span>
          {count === undefined ? null : (
            <span className="sr-only">{count === 1 ? '1 card' : `${count} cards`}</span>
          )}
        </span>
      </div>
      <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
    </header>
  );
}
