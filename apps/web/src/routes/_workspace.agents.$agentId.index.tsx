import { createFileRoute } from '@tanstack/react-router';
import { AgentDetailView } from '@/features/agents/agent-detail/agent-detail-view';

export const Route = createFileRoute('/_workspace/agents/$agentId/')({
  component: AgentDetailPage
});

function AgentDetailPage() {
  const { agentId } = Route.useParams();
  return <AgentDetailView agentId={agentId} />;
}
