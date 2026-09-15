import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';

export function useTripPacking(tripId: Id<'trips'> | undefined) {
  const items = useQuery(api.routes.trips.packing.list.run, tripId ? { tripId } : 'skip');
  const addMutation = useMutation(api.routes.trips.packing.add.run);
  const updateMutation = useMutation(api.routes.trips.packing.update.run);
  const removeMutation = useMutation(api.routes.trips.packing.remove.run);
  const [draft, setDraft] = useState('');
  const [isPending, setPending] = useState(false);

  const add = async () => {
    if (!tripId || !draft.trim()) return;
    setPending(true);
    try {
      await addMutation({ label: draft, tripId });
      setDraft('');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to add packing item'));
    } finally {
      setPending(false);
    }
  };

  const toggle = async (itemId: Id<'tripPackingItems'>, packed: boolean) => {
    if (!tripId) return;
    try {
      await updateMutation({ itemId, packed, tripId });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to update packing item'));
    }
  };

  const remove = async (itemId: Id<'tripPackingItems'>) => {
    if (!tripId) return;
    try {
      await removeMutation({ itemId, tripId });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to remove packing item'));
    }
  };

  return {
    add,
    draft,
    isLoading: items === undefined,
    isPending,
    items: items ?? [],
    remove,
    setDraft,
    toggle
  };
}
