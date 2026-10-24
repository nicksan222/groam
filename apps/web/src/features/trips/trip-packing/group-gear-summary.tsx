import { Check } from '@groam/icons';
import { Heading } from '@groam/ui/components/heading';
import { cn } from '@groam/ui/lib/utils';
import type { PackingItem } from '@/types/packing';
import { PackingCount } from './packing-count';
import { coveredCount } from './packing-coverage';
import { useChanged } from './use-packing-motion';

function CoverageLine({ covered, total }: { covered: number; total: number }) {
  const allCovered = covered === total;
  const changed = useChanged(allCovered);
  const open = total - covered;
  return (
    <>
      <p
        className={cn('text-sm text-muted-foreground', allCovered && 'text-success-foreground')}
        data-all-covered={allCovered ? 'true' : undefined}
      >
        {allCovered ? (
          <span
            className={cn('inline-flex items-center gap-2', changed && 'packing-fade-in')}
            data-changed={changed ? 'true' : undefined}
          >
            <Check aria-hidden className={cn('size-3.5', changed && 'packing-check-pop')} />
            Everything&apos;s covered
          </span>
        ) : (
          <>
            <span className="font-medium text-warning-foreground">
              <PackingCount>{open}</PackingCount> {open === 1 ? 'item' : 'items'}
            </span>{' '}
            {open === 1 ? 'still needs' : 'still need'} someone
          </>
        )}
      </p>
      <span className="sr-only">
        {covered} of {total} items covered
      </span>
    </>
  );
}

/**
 * One quiet line over the sheet: "Group gear", then what is left ("2 items still need someone")
 * or "Everything's covered", with the covered count for screen readers.
 */
export function GroupGearSummary({
  items,
  claimable = true
}: {
  items: readonly PackingItem[];
  claimable?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Heading level={3} size="sm" id="group-gear-heading">
          Group gear
        </Heading>
        {items.length > 0 ? (
          <CoverageLine covered={coveredCount(items)} total={items.length} />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {claimable
          ? 'Claim an item to let the group know what you’re bringing.'
          : 'What the group shares, and who brings it.'}
      </p>
    </div>
  );
}
