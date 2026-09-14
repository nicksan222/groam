import { isAssistantAgentId } from '@groam/ai-contracts/agents/registry';
import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import { Bot } from 'lucide-react';
import { AgentRunTable } from '@/features/agents/agent-run/agent-run-table';
import { useAgent } from '@/features/agents/hooks/use-agent';
import { useStartQueuedAssignRuns } from '@/features/agents/hooks/use-agent-run';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { AgentDetailHeader } from './agent-detail-header';

export function AgentDetailView({ agentId }: { agentId: string }) {
  const validId = isAssistantAgentId(agentId) ? agentId : undefined;
  const { agent, loadMore, runs, status } = useAgent(validId);
  const { activeOrganization } = useWorkspace();
  useStartQueuedAssignRuns(runs);
  const showLoading = validId !== undefined && !agent;
  const showRunsLoading = showLoading || status === 'LoadingFirstPage';

  useSetAgentContext(
    agent
      ? {
          capabilities: [],
          data: {
            activeGroup: activeOrganization.name,
            agentId: agent.id,
            status: agent.status,
            surface: agent.surface
          },
          description: 'Browse this agent’s runs and open one for its log and assigned issue.',
          key: `agents:${agent.id}`,
          title: agent.label
        }
      : null
  );

  if (!validId) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/agents">Back to agents</Link>
          </Button>
        }
        description="This workspace only has chat, issue, and idea-review agents."
        headline="Agent not found"
        icon={Bot}
      />
    );
  }

  if (showLoading) return <PageLoading label="Loading agent…" />;

  return (
    <Shell>
      <Shell.Header>
        {showLoading || !agent ? (
          <AgentDetailHeader isLoading />
        ) : (
          <AgentDetailHeader agent={agent} />
        )}
      </Shell.Header>
      <Shell.Content>
        <Shell.PageStack>
          <Shell.Section stack="sm">
            <Shell.SectionHeader density="compact" title="Runs" />
            <AgentRunTable isLoading={showRunsLoading} runs={runs} />
            {!showRunsLoading && (status === 'CanLoadMore' || status === 'LoadingMore') ? (
              <div className="flex justify-center">
                <Button
                  disabled={status === 'LoadingMore'}
                  onClick={() => loadMore(20)}
                  variant="outline"
                >
                  {status === 'LoadingMore' && <Spinner />} Load more runs
                </Button>
              </div>
            ) : null}
          </Shell.Section>
        </Shell.PageStack>
      </Shell.Content>
    </Shell>
  );
}
