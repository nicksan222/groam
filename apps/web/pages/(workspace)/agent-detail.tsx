import { AgentDetailView } from '@/features/agents/agent-detail/agent-detail-view';
import { useParams } from '@/lib/navigation/router';

export default function AgentDetailPage() {
  const { agentId = '' } = useParams<{ agentId: string }>();
  return <AgentDetailView agentId={agentId} />;
}
