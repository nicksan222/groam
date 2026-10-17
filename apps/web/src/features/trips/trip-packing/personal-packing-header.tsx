import { cn } from '@groam/ui/lib/utils';
import { Check, Lock } from 'lucide-react';
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

/** Title, privacy note, and "N of M packed" with a hairline of progress and an "All packed" moment. */
export function PersonalPackingHeader({
  items,
  readOnly
}: {
  items: readonly PersonalPackingItem[];
  readOnly: boolean;
}) {
  const packed = items.filter((item) => item.packed).length;
  const allPacked = items.length > 0 && packed === items.length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold" id="my-packing-heading">
          My list
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Lock aria-hidden className="size-3" />
          Only you can see this
        </span>
      </div>
      <p
        className={cn('text-xs text-muted-foreground', allPacked && 'text-success-foreground')}
        data-all-packed={allPacked ? 'true' : undefined}
      >
        {items.length > 0 ? (
          <PackedLine packed={packed} total={items.length} />
        ) : readOnly ? (
          'Archived, so read-only.'
        ) : (
          'Your own checklist, apart from the group.'
        )}
      </p>
      {items.length > 0 ? (
        <PackingProgress
          className="mt-1.5 w-56 max-w-full"
          state={allPacked ? 'covered' : 'missing'}
          total={items.length}
          value={packed}
        />
      ) : null}
    </div>
  );
}
