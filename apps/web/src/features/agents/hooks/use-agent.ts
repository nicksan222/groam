import type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';
import { api } from '@groam/backend/api';
import { usePaginatedQuery, useQuery } from 'convex/react';

export type { AgentRun } from '@/types/agents';

export function useAgentRecord(agentId: AssistantAgentId | undefined) {
  const agent = useQuery(api.routes.agents.get.run, agentId ? { agentId } : 'skip');
  return agent ?? undefined;
}

export function useAgent(agentId: AssistantAgentId | undefined) {
  const agent = useAgentRecord(agentId);
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.agents.runs.list.run,
    agentId ? { agentId } : 'skip',
    { initialNumItems: 20 }
  );
  return {
    agent,
    loadMore,
    runs: results,
    status
  };
}
