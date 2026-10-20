import { isActiveAgentRun } from '@groam/ai/backend/runs/roster';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { useAgentRunControls, useAgentRunEvents } from '@/features/agents/hooks/use-agent-run';
import { errorMessage } from '@/lib/errors';
import type { ResearchEffort } from '@/types/research';
import { useLatestResearchRun } from './use-latest-research-run';

/** Persisted research activity; subscriptions keep the report visible after a reload. */
export function useResearchRun(discussionId: Id<'discussions'>) {
  const run = useLatestResearchRun(discussionId);
  const startMutation = useMutation(api.routes.discussions.research.start.run);
  const { stop } = useAgentRunControls();
  const { events } = useAgentRunEvents(run?.id);
  const [isStarting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback(
    async (input: { effort: ResearchEffort; topic: string }) => {
      setStarting(true);
      setError(null);
      try {
        await startMutation({ discussionId, ...input });
        return true;
      } catch (failure: unknown) {
        setError(errorMessage(failure, 'Unable to start research. Try again.'));
        return false;
      } finally {
        setStarting(false);
      }
    },
    [discussionId, startMutation]
  );
  return {
    error,
    events,
    isActive: run ? isActiveAgentRun(run) : false,
    isLoading: run === undefined,
    isStarting,
    run,
    start,
    stop: async () => {
      if (!run) return;
      try {
        await stop({ runId: run.id });
      } catch (failure: unknown) {
        setError(errorMessage(failure, 'Unable to stop research. Try again.'));
      }
    }
  };
}
