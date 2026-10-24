import { dayHue, dayHueCount } from './trip-map-stops';

/** What the pill dots mean: the day hues in use, and the muted one for a stop with no day. */
export function MapLegend({
  dayCount,
  hasUnscheduled
}: {
  dayCount: number;
  hasUnscheduled: boolean;
}) {
  const swatches = Array.from({ length: Math.min(dayCount, dayHueCount) }, (_, index) => ({
    color: dayHue(index + 1),
    label:
      dayCount > dayHueCount && index === dayHueCount - 1
        ? `Day ${index + 1}, then repeats`
        : `Day ${index + 1}`
  }));
  if (hasUnscheduled) swatches.push({ color: dayHue(null), label: 'No day yet' });
  if (swatches.length === 0) return null;
  return (
    <ul
      aria-label="Map legend"
      className="flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-background/90 p-3 text-xs shadow-md backdrop-blur-sm"
    >
      {swatches.map(({ color, label }) => (
        <li className="flex items-center gap-1" key={label}>
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}
