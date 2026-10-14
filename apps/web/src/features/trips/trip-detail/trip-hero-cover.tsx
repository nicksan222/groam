import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { MapPinned, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';

export function TripHeroCover({
  retryCover,
  trip
}: {
  retryCover: () => Promise<boolean>;
  trip: TripDetail;
}) {
  const retrying = useAsyncPending();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = trip.coverUrl && trip.coverUrl !== failedSource;
  const isBusy = retrying.isPending || trip.coverStatus === 'pending';
  const canRefreshCover =
    trip.permissions.canEditCover &&
    (isBusy || trip.coverStatus === 'failed' || trip.coverAttribution !== null);

  const findAnotherCover = async () => {
    await retrying.run(async () => {
      await retryCover();
    });
  };

  return (
    <div className="group/hero-cover relative h-32 w-full basis-full overflow-hidden rounded-lg bg-muted sm:h-44">
      {showImage ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          src={trip.coverUrl ?? undefined}
          onError={() => setFailedSource(trip.coverUrl)}
        />
      ) : (
        <div className="absolute inset-0 grid size-full place-items-center">
          <MapPinned className="size-4 text-muted-foreground/40" />
        </div>
      )}
      {canRefreshCover ? (
        <div
          className={cn(
            'absolute inset-0 grid place-items-center',
            'opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
            'group-hover/hero-cover:opacity-100 group-focus-within/hero-cover:opacity-100',
            isBusy && 'opacity-100'
          )}
        >
          <Button
            aria-busy={isBusy}
            aria-label={coverRefreshLabel(trip.coverStatus, isBusy)}
            className="border-border"
            disabled={isBusy}
            onClick={() => void findAnotherCover()}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            {isBusy ? <Spinner className="size-3 motion-reduce:animate-none" /> : <RotateCcw />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function coverRefreshLabel(coverStatus: TripDetail['coverStatus'], isBusy: boolean) {
  if (isBusy) return 'Finding another image';
  if (coverStatus === 'failed') return 'Retry cover';
  return 'Find another image';
}
