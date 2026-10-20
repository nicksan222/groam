import { RecordListItem } from '@groam/ui/components/record-list-item';
import { Skeleton } from '@groam/ui/components/skeleton';

const ROWS = [0, 1, 2] as const;

/** Placeholder rows with the final row's shape, so the list lands without moving anything. */
export function GroupGearSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading group gear…"
      className="min-w-0 divide-y divide-border/40 overflow-hidden rounded-lg border border-border/60"
    >
      {ROWS.map((row) => (
        <li className="min-w-0" key={row}>
          <RecordListItem
            title={<Skeleton className="h-5 w-40 max-w-full" />}
            metadata={<Skeleton className="h-5 w-32 rounded-full" />}
            badges={<Skeleton className="h-7 w-28" />}
          >
            <Skeleton className="mt-2 h-6 w-28 rounded-full" />
          </RecordListItem>
        </li>
      ))}
    </ul>
  );
}
