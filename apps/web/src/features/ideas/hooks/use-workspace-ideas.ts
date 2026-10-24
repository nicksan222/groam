import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';

export function useCreateIdea() {
  const createMutation = useMutation(api.routes.trips.versions.create.run);
  return useCallback(
    async (tripId: Id<'trips'>, title?: string) => {
      try {
        return await createMutation(title ? { title, tripId } : { tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to start an idea'));
        return null;
      }
    },
    [createMutation]
  );
}
