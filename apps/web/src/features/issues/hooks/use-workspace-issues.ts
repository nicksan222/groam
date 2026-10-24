import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import type { IssueConditionInput, IssueSubject } from '@/types/issues';

export function useCreateIssue() {
  const createMutation = useMutation(api.routes.trips.issues.create.run);
  return useCallback(
    async (
      tripId: Id<'trips'>,
      title: string,
      body: string,
      extras: IssueConditionInput & { subject?: IssueSubject } = {}
    ) => {
      try {
        return await createMutation({ body, ...extras, title, tripId });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to create trip issue'));
        return null;
      }
    },
    [createMutation]
  );
}
