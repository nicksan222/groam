import { ArrowUpRight, BedDouble, Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { IconTile } from '@groam/ui/components/icon-tile';
import { dayHue, legLabel, stopDaysLabel } from '@/features/trips/trip-map/trip-map-stops';
import type { Destination } from '@/types/trips';
import { jumpToStop } from './trip-jump-targets';

/** One stop of the route: its number in its first day's hue, its days, what is planned there, and the leg out. */
export function RouteStopRow({
  dayPlanner,
  destination,
  isLast,
  number
}: {
  dayPlanner: boolean;
  destination: Destination;
  isLast: boolean;
  number: number;
}) {
  const leg = legLabel(destination.transferToNext);
  const activities = destination.activities.length;
  const stays = destination.stays.length;
  return (
    <li className="relative min-w-0">
      <Button
        aria-label={`Jump to ${destination.name}`}
        className="group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => jumpToStop(destination.id, dayPlanner ? destination.startDay : null)}
        type="button"
        unstyled
      >
        <IconTile
          aria-hidden
          className="relative z-10 mt-1 text-[11px] font-semibold tabular-nums text-background"
          radius="full"
          size="sm"
          style={{ backgroundColor: dayHue(destination.startDay) }}
          variant="plain"
        >
          {number}
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">{destination.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {stopDaysLabel(destination)}
          </span>
          {activities > 0 || stays > 0 ? (
            <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {activities > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles aria-hidden className="size-3" />
                  {activities} {activities === 1 ? 'activity' : 'activities'}
                </span>
              ) : null}
              {stays > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <BedDouble aria-hidden className="size-3" />
                  {stays} {stays === 1 ? 'stay' : 'stays'}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <ArrowUpRight
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary"
        />
      </Button>
      {isLast ? null : (
        <p className="ml-6 flex min-h-6 items-center gap-2 border-l border-dashed border-border pl-6 text-xs text-muted-foreground">
          {leg ?? 'Travel not set yet'}
        </p>
      )}
    </li>
  );
}
