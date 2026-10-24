import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type { MapStop } from '@/types/trips';
import { dayHue } from './trip-map-stops';

/** A stop as a pill: its hue dot, its number in the route, and its name. */
export function MapPillMarker({
  active,
  onSelect,
  stop
}: {
  active: boolean;
  onSelect: () => void;
  stop: MapStop;
}) {
  return (
    <Button
      aria-label={`Show ${stop.destination.name} on map`}
      aria-pressed={active}
      className={cn(
        'flex select-none items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-2 pr-3 text-xs font-semibold shadow-md transition-all',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-foreground hover:bg-muted'
      )}
      onClick={onSelect}
      type="button"
      unstyled
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: dayHue(stop.colorDay) }}
      />
      <span className="text-[10px] font-medium tabular-nums opacity-60">
        {String(stop.number).padStart(2, '0')}
      </span>
      <span className="max-w-40 truncate">{stop.destination.name}</span>
    </Button>
  );
}
