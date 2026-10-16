import { Skeleton } from '@groam/ui/components/skeleton';

export function TripToolbarSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-[120px] w-full shrink-0 flex-col justify-end gap-2 border-b border-border bg-muted/40 px-6 py-4 sm:min-h-[140px]"
      data-slot="trip-toolbar-skeleton"
    >
      <Skeleton className="h-6 w-56 max-w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
      </div>
    </div>
  );
}
