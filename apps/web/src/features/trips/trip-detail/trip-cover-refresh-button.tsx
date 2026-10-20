import { RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import type { TripCover } from '@/types/trip-cover';

export function TripCoverRefreshButton({
  className,
  cover
}: {
  className?: string;
  cover: TripCover;
}) {
  return (
    <Button
      aria-busy={cover.isBusy}
      aria-label={cover.refreshLabel}
      className={className}
      disabled={cover.isBusy}
      onClick={cover.refresh}
      size="icon-xs"
      type="button"
      variant="outline"
    >
      {cover.isBusy ? <Spinner className="size-3 motion-reduce:animate-none" /> : <RotateCcw />}
    </Button>
  );
}
