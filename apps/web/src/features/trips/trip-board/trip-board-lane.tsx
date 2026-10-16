import { useDroppable } from '@dnd-kit/core';
import { cn } from '@groam/ui/lib/utils';
import { Ban } from 'lucide-react';
import type { ReactNode } from 'react';
import { testIds } from '@/lib/test-ids';
import type { TripBoardLane as Lane } from '@/types/trip-board';
import { laneData, laneDroppableId } from './trip-board-drag-data';
import { useTripBoardDrag } from './trip-board-drag-state';
import { TripBoardEmpty } from './trip-board-empty';
import { TripBoardLaneHeader } from './trip-board-lane-header';
import { decideTransfer } from './trip-board-moves';

/** A lane the lifted card may land in takes a quiet tint; the one under it takes a little more. */
const allowedClass = 'bg-primary/5 ring-1 ring-primary/20';
const hoveredClass = 'bg-primary/10 ring-primary/30';

/** Why a drop here is refused, laid over the lane the lifted card is hovering. */
function RefusedOverlay({ reason }: { reason: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 bg-background/85 p-6 text-center backdrop-blur-[1px]"
      data-testid={testIds.tripBoardDropHint}
      role="status"
    >
      <Ban aria-hidden className="size-5 text-destructive" />
      <p className="text-sm font-medium">Can’t drop here</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{reason}</p>
    </div>
  );
}

/**
 * One Trello-style column of fixed width: header, cards, footer. It is a drop target: a lane the
 * lifted card may enter takes a soft tint, and a refused one says why at its top.
 */
export function TripBoardLane({
  children,
  count,
  empty,
  footer,
  lane,
  meta,
  quiet = false
}: {
  children?: ReactNode;
  count: number | undefined;
  /** Shown instead of cards when the lane has none; omit to show nothing. */
  empty?: ReactNode;
  footer?: ReactNode;
  lane: Lane;
  meta?: ReactNode;
  /** Softer container for dropped work. */
  quiet?: boolean;
}) {
  const { item, target } = useTripBoardDrag();
  const { setNodeRef } = useDroppable({ data: laneData(lane), id: laneDroppableId(lane) });
  const headingId = `trip-board-${lane}`;
  const decision = item ? decideTransfer(item, lane) : null;
  const hovered = target?.lane === lane;
  const allowed = decision?.outcome === 'allowed';
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'relative flex w-[88vw] shrink-0 snap-center sm:snap-start flex-col gap-2 rounded-xl p-3 sm:max-h-full sm:w-72 motion-safe:transition-[box-shadow,background-color] motion-safe:duration-200',
        quiet ? 'border border-dashed border-border bg-transparent' : 'bg-muted/50',
        allowed && allowedClass,
        allowed && hovered && hoveredClass
      )}
      data-drop={decision?.outcome}
      data-lane={lane}
      data-over={hovered || undefined}
      data-testid={testIds.tripBoardLane}
      ref={setNodeRef}
    >
      <TripBoardLaneHeader count={count} headingId={headingId} lane={lane} />
      {decision?.outcome === 'refused' && hovered ? (
        <RefusedOverlay reason={decision.reason} />
      ) : null}
      {meta ? <div className="px-3 pb-1">{meta}</div> : null}
      {count === 0 && empty ? (
        <TripBoardEmpty>{empty}</TripBoardEmpty>
      ) : (
        <div className="-m-1 flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      )}
      {footer ? (
        <footer className="mt-auto flex min-h-8 items-center gap-x-3 px-1 pt-1">{footer}</footer>
      ) : null}
    </section>
  );
}
