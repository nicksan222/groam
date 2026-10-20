import { Check } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type { PackingItem } from '@/types/packing';
import { PackingCount } from './packing-count';
import { coveredCount } from './packing-coverage';
import { PackingProgress } from './packing-progress';
import { useChanged } from './use-packing-motion';

/**
 * The line under "Group gear": how many items are fully covered, a hairline of overall
 * progress, and a quiet "Everything's covered" once nothing is missing.
 */
export function GroupGearSummary({
  items,
  claimable = true
}: {
  items: readonly PackingItem[];
  claimable?: boolean;
}) {
  const covered = coveredCount(items);
  const allCovered = items.length > 0 && covered === items.length;
  const changed = useChanged(allCovered);
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold" id="group-gear-heading">
          Group gear
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          What the group shares, and who brings it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold" id="group-gear-heading">
          Group gear
        </h3>
        <p
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            allCovered && 'text-success-foreground'
          )}
          data-all-covered={allCovered ? 'true' : undefined}
        >
          {allCovered ? (
            <span
              className={cn('inline-flex items-center gap-1', changed && 'packing-fade-in')}
              data-changed={changed ? 'true' : undefined}
            >
              <Check aria-hidden className={cn('size-3', changed && 'packing-check-pop')} />
              Everything&apos;s covered
              <span className="sr-only">
                : {covered} of {items.length} items covered
              </span>
            </span>
          ) : (
            <span>
              <PackingCount>{covered}</PackingCount> of <PackingCount>{items.length}</PackingCount>{' '}
              items covered
            </span>
          )}
        </p>
      </div>
      <p className="-mt-1.5 text-xs text-muted-foreground">
        {claimable
          ? 'Claim an item to let the group know what you’re bringing.'
          : 'What the group shares, and who brings it.'}
      </p>
      <PackingProgress
        className="h-1"
        state={allCovered ? 'covered' : 'missing'}
        total={items.length}
        value={covered}
      />
    </div>
  );
}
