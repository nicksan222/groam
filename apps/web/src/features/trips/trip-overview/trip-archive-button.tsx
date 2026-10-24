import { Archive, RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useArchiveTrip } from '@/features/trips/hooks/use-archive-trip';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { testIds } from '@/lib/test-ids';

export function TripArchiveButton({ trip, tripState }: { trip: TripDetail; tripState: TripState }) {
  const { archive, isPending, restore } = useArchiveTrip(tripState);
  const isArchived = trip.archivedAt !== null;

  if (isArchived) {
    return (
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-center text-xs text-muted-foreground">
          This trip is archived and read-only.
        </p>
        {trip.permissions.canRestore ? (
          <Button
            className="w-full"
            onClick={() => void restore()}
            pending={isPending}
            size="sm"
            variant="outline"
          >
            <RotateCcw />
            Restore trip
          </Button>
        ) : null}
      </div>
    );
  }

  if (!trip.permissions.canArchive) return null;

  return (
    <div className="border-t border-border pt-3">
      <Button
        className="w-full text-muted-foreground"
        data-testid={testIds.tripArchive}
        onClick={() => void archive()}
        pending={isPending}
        size="sm"
        variant="ghost"
      >
        <Archive />
        Archive trip
      </Button>
    </div>
  );
}
