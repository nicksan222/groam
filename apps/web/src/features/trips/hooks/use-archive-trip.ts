import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';

export function useArchiveTrip(tripState: TripState) {
  const pending = useAsyncPending();
  const confirm = useConfirm();
  const archive = async () => {
    if (!(await confirm('Archive this trip?', 'It will become read-only until restored.'))) return;
    await pending.run(async () => {
      await tripState.archive();
    });
  };
  const restore = async () => {
    await pending.run(async () => {
      await tripState.restore();
    });
  };
  return { archive, isPending: pending.isPending, restore };
}
