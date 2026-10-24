import { cn } from '@groam/ui/lib/utils';
import type { PackingCoverage } from '@/types/packing';

const SEGMENT_CAP = 8;

const fillStyle = {
  covered: 'bg-success',
  missing: 'bg-muted-foreground/60',
  over: 'bg-info'
} as const;

/**
 * A quiet, decorative progress bar (the text beside it carries the meaning). Up to eight
 * segments when `total` is small, one continuous bar otherwise. Fills scale from the left.
 */
export function PackingProgress({
  className,
  state,
  total,
  value
}: {
  className?: string;
  state: PackingCoverage['state'];
  total: number;
  value: number;
}) {
  const fill = fillStyle[state];
  const segmented = total >= 1 && total <= SEGMENT_CAP;
  const cells = segmented ? total : 1;
  return (
    <span
      aria-hidden
      className={cn('flex h-1.5 w-full items-center gap-1', className)}
      data-segments={segmented ? total : undefined}
      data-state={state}
      data-slot="packing-progress"
    >
      {Array.from({ length: cells }, (_, index) => {
        const filled = segmented
          ? value > index
            ? 1
            : 0
          : total > 0
            ? Math.min(1, Math.max(0, value / total))
            : 0;
        return (
          <span
            className="relative h-full min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/10"
            key={`segment-${index}`}
          >
            <span
              className={cn(
                'absolute inset-0 origin-left rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none',
                fill
              )}
              data-filled={filled > 0 ? 'true' : 'false'}
              style={{ transform: `scaleX(${filled})` }}
            />
          </span>
        );
      })}
    </span>
  );
}
