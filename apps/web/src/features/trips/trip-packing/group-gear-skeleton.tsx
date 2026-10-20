import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import { packingListClass, packingRowClass } from './packing-row-classes';

const ROWS = [0, 1, 2] as const;

/** Placeholder rows with the final row's shape, so the list lands without moving anything. */
export function GroupGearSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading group gear…" className={packingListClass}>
      {ROWS.map((row) => (
        <li
          className={cn(
            packingRowClass,
            'flex flex-col gap-3 @lg/gear:flex-row @lg/gear:items-center @lg/gear:gap-5'
          )}
          key={row}
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="mt-1 h-[1.625rem] w-28 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-3 @lg/gear:gap-5">
            <div className="flex w-24 flex-col gap-1 @lg/gear:w-28 @lg/gear:items-end">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-28 @lg/gear:w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}
