import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { dayHue } from './trip-map-stops';

/** "All days" and one chip per day, each dotted in the hue its stops wear on the map. */
export function MapDaySelector({
  dayCount,
  onSelect,
  selected
}: {
  dayCount: number;
  onSelect: (day: number | null) => void;
  selected: number | null;
}) {
  return (
    <div
      aria-label="Show a day on the map"
      className="flex max-w-full items-center gap-1 overflow-auto rounded-full border border-border/60 bg-background/90 p-1 shadow-md backdrop-blur-sm"
      role="group"
    >
      <Button
        aria-pressed={selected === null}
        className={cn(
          'shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        onClick={() => onSelect(null)}
        type="button"
        unstyled
      >
        All days
      </Button>
      {Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        return (
          <Button
            aria-pressed={selected === day}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors',
              selected === day
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            key={day}
            onClick={() => onSelect(day)}
            type="button"
            unstyled
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: dayHue(day) }}
            />
            Day {day}
          </Button>
        );
      })}
    </div>
  );
}
