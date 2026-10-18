import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { attempt as attemptWrite, attemptValue } from '@/lib/errors';
import type { PersonalPackingItem } from '@/types/packing';

/** The viewer's private checklist for a trip; nobody else can read or write it. */
export function useTripPersonalPacking(tripId: Id<'trips'> | undefined) {
  const items = useQuery(api.routes.trips.packing.personal.list.run, tripId ? { tripId } : 'skip');
  const addMutation = useMutation(api.routes.trips.packing.personal.add.run);
  const updateMutation = useMutation(api.routes.trips.packing.personal.update.run);
  const removeMutation = useMutation(api.routes.trips.packing.personal.remove.run);

  const attempt = useCallback(
    async (write: (tripId: Id<'trips'>) => Promise<unknown>, fallback: string) =>
      tripId ? attemptWrite(() => write(tripId), fallback) : false,
    [tripId]
  );

  const add = useCallback(
    (label: string) =>
      attempt(
        (id) => addMutation({ label, tripId: id }),
        'Couldn’t add that to your list. Try again.'
      ),
    [addMutation, attempt]
  );
  const setPacked = useCallback(
    (itemId: Id<'tripPersonalPackingItems'>, packed: boolean) =>
      attempt(
        (id) => updateMutation({ itemId, packed, tripId: id }),
        'Couldn’t update your list. Try again.'
      ),
    [attempt, updateMutation]
  );
  const remove = useCallback(
    async (item: PersonalPackingItem) => {
      const done = await attempt(
        (id) => removeMutation({ itemId: item.id, tripId: id }),
        'Couldn’t remove that from your list. Try again.'
      );
      if (!done || !tripId) return done;
      toast(`Removed ${item.label}`, {
        action: {
          label: 'Undo',
          onClick: () =>
            void (async () => {
              const restored = await attemptValue(
                () => addMutation({ label: item.label, tripId }),
                'Couldn’t undo that. Try again.'
              );
              if (!restored || !item.packed) return;
              await attempt(
                () => updateMutation({ itemId: restored.id, packed: true, tripId }),
                `${item.label} is back on your list, but we couldn’t tick it again.`
              );
            })()
        }
      });
      return true;
    },
    [addMutation, attempt, removeMutation, tripId, updateMutation]
  );

  return { add, isLoading: items === undefined, items: items ?? [], remove, setPacked };
}
