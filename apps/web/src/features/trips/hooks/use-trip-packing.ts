import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { attempt as attemptWrite, attemptValue } from '@/lib/errors';
import type { PackingItem } from '@/types/packing';

/** The group's shared gear: needed counts and who brings how many. Edits need an idea copy. */
export function useTripPacking(tripId: Id<'trips'> | undefined) {
  const items = useQuery(api.routes.trips.packing.list.run, tripId ? { tripId } : 'skip');
  const addMutation = useMutation(api.routes.trips.packing.add.run);
  const updateMutation = useMutation(api.routes.trips.packing.update.run);
  const removeMutation = useMutation(api.routes.trips.packing.remove.run);
  const bringMutation = useMutation(api.routes.trips.packing.bring.run);

  const attempt = useCallback(
    async (write: (tripId: Id<'trips'>) => Promise<unknown>, fallback: string) =>
      tripId ? attemptWrite(() => write(tripId), fallback) : false,
    [tripId]
  );

  const add = useCallback(
    (label: string, quantity: number) =>
      attempt(
        (id) => addMutation({ label, quantity, tripId: id }),
        'Couldn’t add that item. Try again.'
      ),
    [addMutation, attempt]
  );
  const update = useCallback(
    (itemId: Id<'tripPackingItems'>, changes: { label?: string; quantity?: number }) =>
      attempt(
        (id) => updateMutation({ itemId, ...changes, tripId: id }),
        'Couldn’t save that change. Try again.'
      ),
    [attempt, updateMutation]
  );
  const bring = useCallback(
    async (
      itemId: Id<'tripPackingItems'>,
      userId: string,
      count: number,
      /** What the traveler brought before; dropping to 0 offers an Undo back to it. */
      previousCount = 0
    ) => {
      const done = await attempt(
        (id) => bringMutation({ count, itemId, tripId: id, userId }),
        'Couldn’t update who is bringing this. Try again.'
      );
      if (done && count === 0 && previousCount > 0) {
        toast('Taken off this item', {
          action: {
            label: 'Undo',
            onClick: () =>
              void attempt(
                (id) => bringMutation({ count: previousCount, itemId, tripId: id, userId }),
                'Couldn’t undo that. Try again.'
              )
          }
        });
      }
      return done;
    },
    [attempt, bringMutation]
  );
  /** Re-adds a removed item with its label and quantity, then puts its bringers back. */
  const restoreItem = useCallback(
    async (item: PackingItem) => {
      if (!tripId) return;
      const created = await attemptValue(
        () => addMutation({ label: item.label, quantity: item.quantity, tripId }),
        'Couldn’t undo that. Try again.'
      );
      if (!created) return;
      // The item returns at the end of the list; its old position is not restored.
      const results = await Promise.allSettled(
        item.bringers.map((bringer) =>
          bringMutation({
            count: bringer.count,
            itemId: created.id,
            tripId,
            userId: bringer.userId
          })
        )
      );
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) {
        toast.error(
          `${item.label} is back, but we couldn’t restore ${failed === 1 ? 'one person' : `${failed} people`} who was bringing it.`
        );
      }
    },
    [addMutation, bringMutation, tripId]
  );

  const remove = useCallback(
    async (item: PackingItem) => {
      const done = await attempt(
        (id) => removeMutation({ itemId: item.id, tripId: id }),
        'Couldn’t remove that item. Try again.'
      );
      if (!done) return false;
      toast(`Removed ${item.label}`, {
        action: {
          label: 'Undo',
          onClick: () => void restoreItem(item)
        }
      });
      return true;
    },
    [attempt, removeMutation, restoreItem]
  );

  return { add, bring, isLoading: items === undefined, items: items ?? [], remove, update };
}
