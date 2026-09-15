import { createFileRoute } from '@tanstack/react-router';
import { AgentRunView } from '@/features/agents/agent-run/agent-run-view';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/agents/$agentId/$runId')({
  component: AgentRunPage
});

function AgentRunPage() {
  const { agentId, runId } = useResolvedParams(Route.useParams());
  return <AgentRunView agentId={agentId} runId={runId} />;
}
