import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { Archive, RotateCcw } from 'lucide-react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';

export function TripArchiveButton({ trip, tripState }: { trip: TripDetail; tripState: TripState }) {
  const pending = useAsyncPending();
  const confirm = useConfirm();
  const isArchived = trip.archivedAt !== null;

  const archive = async () => {
    if (!(await confirm('Archive this trip?', 'It will become read-only until restored.'))) {
      return;
    }
    await pending.run(async () => {
      await tripState.archive();
    });
  };

  const restore = async () => {
    await pending.run(async () => {
      await tripState.restore();
    });
  };

  if (isArchived) {
    return (
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-center text-xs text-muted-foreground">
          This trip is archived and read-only.
        </p>
        {trip.permissions.canRestore ? (
          <Button
            className="w-full"
            disabled={pending.isPending}
            onClick={() => void restore()}
            size="sm"
            variant="outline"
          >
            {pending.isPending ? <Spinner /> : <RotateCcw />}
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
        disabled={pending.isPending}
        onClick={() => void archive()}
        size="sm"
        variant="ghost"
      >
        {pending.isPending ? <Spinner /> : <Archive />}
        Archive trip
      </Button>
    </div>
  );
}
