import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import { packingActionColumnClass, packingListClass, packingRowClass } from './packing-row-classes';

const ROWS = [0, 1, 2] as const;

/** Placeholder rows with the final row's shape, so the list lands without moving anything. */
export function GroupGearSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading group gear…" className={packingListClass}>
      {ROWS.map((row) => (
        <li
          className={cn(
            packingRowClass,
            'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'
          )}
          key={row}
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="mt-1 h-[1.625rem] w-28 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-[2.125rem] w-28" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className={cn('hidden h-6 sm:block', packingActionColumnClass)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
