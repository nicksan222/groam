import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

export function useAgentRoster() {
  const agents = useQuery(api.routes.agents.list.run, {});
  return { agents, isLoading: agents === undefined };
}
