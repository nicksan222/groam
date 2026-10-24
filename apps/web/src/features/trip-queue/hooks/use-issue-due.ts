import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { attempt } from '@/lib/errors';

/** Sets or clears an issue's decide-by date, the issue id given per call so one hook serves a batch. */
export function useIssueDue() {
  const dueMutation = useMutation(api.routes.trips.issues.due.run);
  return useCallback(
    (issueId: Id<'tripIssues'>, dueAt: number | null) =>
      attempt(() => dueMutation({ dueAt, issueId }), 'Unable to set a decide-by date'),
    [dueMutation]
  );
}
