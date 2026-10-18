import { useEffect, useRef } from 'react';
import type { useTrips } from '@/features/trips/hooks/use-trips';

export function useTripListAutoLoad({
  loadMore,
  status
}: Pick<ReturnType<typeof useTrips>, 'loadMore' | 'status'>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || status !== 'CanLoadMore' || typeof IntersectionObserver === 'undefined')
      return;

    let requested = false;
    const observer = new IntersectionObserver((entries) => {
      if (requested || !entries.some((entry) => entry.isIntersecting)) return;
      requested = true;
      observer.disconnect();
      loadMore(25);
    });
    observer.observe(sentinel);
    return () => {
      requested = true;
      observer.disconnect();
    };
  }, [loadMore, status]);

  return sentinelRef;
}
