import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';

const noWaits: never[] = [];

/** The wait a run is suspended on; skipped (undefined) without a run id. */
export function useRunWait(runId: Id<'agentRuns'> | undefined) {
  return useQuery(api.routes.agents.waits.run.run, runId ? { runId } : 'skip');
}

/** Runs in a chat that wait on the group; empty while loading. */
export function useDiscussionWaits(discussionId: Id<'discussions'>) {
  return useQuery(api.routes.agents.waits.discussion.run, { discussionId }) ?? noWaits;
}

/** Cancels a wait (the run resumes and wraps up); false after a toasted failure. */
export function useCancelWait() {
  const cancel = useMutation(api.routes.agents.waits.cancel.run);
  return useCallback(
    async (waitId: Id<'agentWaits'>) => {
      try {
        await cancel({ waitId });
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to cancel this wait'));
        return false;
      }
    },
    [cancel]
  );
}
