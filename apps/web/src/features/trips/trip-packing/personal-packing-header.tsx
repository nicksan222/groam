import { Check } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type { PersonalPackingItem } from '@/types/packing';
import { PackingCount } from './packing-count';
import { PackingProgress } from './packing-progress';
import { useChanged } from './use-packing-motion';

function PackedLine({ packed, total }: { packed: number; total: number }) {
  const allPacked = total > 0 && packed === total;
  const changed = useChanged(allPacked);
  if (allPacked) {
    return (
      <span className={cn('inline-flex items-center gap-1', changed && 'packing-fade-in')}>
        <Check aria-hidden className={cn('size-3', changed && 'packing-check-pop')} />
        All packed
        <span className="sr-only">
          : {packed} of {total} packed
        </span>
      </span>
    );
  }
  return (
    <>
      <PackingCount>{packed}</PackingCount> of <PackingCount>{total}</PackingCount> packed
    </>
  );
}

/** Title and "N of M packed" over a full-width progress line. */
export function PersonalPackingHeader({ items }: { items: readonly PersonalPackingItem[] }) {
  const packed = items.filter((item) => item.packed).length;
  const allPacked = items.length > 0 && packed === items.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold" id="my-packing-heading">
          My bag
        </h3>
        {items.length > 0 ? (
          <p
            className={cn('text-xs text-muted-foreground', allPacked && 'text-success-foreground')}
            data-all-packed={allPacked ? 'true' : undefined}
          >
            <PackedLine packed={packed} total={items.length} />
          </p>
        ) : null}
      </div>
      {items.length > 0 ? (
        <PackingProgress
          className="h-1"
          state={allPacked ? 'covered' : 'missing'}
          total={items.length}
          value={packed}
        />
      ) : null}
    </div>
  );
}
