import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { useTripListAutoLoad } from '@/features/trips/hooks/use-trip-list-auto-load';
import type { useTrips } from '@/features/trips/hooks/use-trips';

export function TripListPagination({
  loadMore,
  status
}: Pick<ReturnType<typeof useTrips>, 'loadMore' | 'status'>) {
  const sentinelRef = useTripListAutoLoad({ loadMore, status });
  return (
    <div className="flex min-h-10 justify-center" ref={sentinelRef}>
      <Button disabled={status === 'LoadingMore'} onClick={() => loadMore(25)} variant="ghost">
        {status === 'LoadingMore' && <Spinner />}{' '}
        {status === 'LoadingMore' ? 'Loading more trips…' : 'Load more trips'}
      </Button>
    </div>
  );
}
