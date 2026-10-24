import { AgentRunView } from '@/features/agents/agent-run/agent-run-view';
import { useParams } from '@/features/workspace/navigation/router';

export default function AgentRunPage() {
  const { agentId = '', runId = '' } = useParams<{ agentId: string; runId: string }>();
  return <AgentRunView agentId={agentId} runId={runId} />;
}
