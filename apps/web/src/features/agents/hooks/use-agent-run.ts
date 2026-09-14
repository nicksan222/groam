import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { errorMessage } from '@/lib/errors';

export type { AgentRunEvent } from '@/types/agents';

export function useAgentRunEvents(runId: Id<'agentRuns'> | undefined) {
  const pagination = usePaginatedQuery(
    api.routes.agents.runs.events.run,
    runId ? { runId } : 'skip',
    { initialNumItems: 40 }
  );
  return {
    events: [...pagination.results].reverse(),
    loadMore: pagination.loadMore,
    status: pagination.status
  };
}

export function useIssueAgentRun(issueId: Id<'tripIssues'> | undefined) {
  return useQuery(api.routes.agents.runs.issue.run, issueId ? { issueId } : 'skip');
}

export function useAgentRun(runId: Id<'agentRuns'> | undefined) {
  return useQuery(api.routes.agents.runs.get.run, runId ? { runId } : 'skip');
}

export function useAgentRunControls() {
  const start = useAction(api.routes.agents.runs.start.run);
  const stop = useMutation(api.routes.agents.runs.stop.run);
  const retryMutation = useMutation(api.routes.agents.runs.retry.run);
  const retry = useCallback(
    async ({ runId }: { runId: Id<'agentRuns'> }) => {
      try {
        const nextRunId = await retryMutation({ runId });
        await start({ runId: nextRunId });
        return nextRunId;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to re-run this agent'));
        return undefined;
      }
    },
    [retryMutation, start]
  );
  return { retry, start, stop };
}

export function useStartQueuedAssignRuns(
  runs: Array<{ id: Id<'agentRuns'>; kickoff: string; status: string; surface: string }> | undefined
) {
  const { start } = useAgentRunControls();
  const started = useRef(new Set<string>());
  useEffect(() => {
    if (!runs) return;
    for (const run of runs) {
      if (run.surface !== 'standalone' || run.status !== 'queued' || run.kickoff !== 'assign') {
        continue;
      }
      if (started.current.has(run.id)) continue;
      started.current.add(run.id);
      void start({ runId: run.id });
    }
  }, [runs, start]);
}
