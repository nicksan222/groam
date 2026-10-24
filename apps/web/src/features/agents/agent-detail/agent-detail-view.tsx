import { isAssistantAgentId } from '@groam/ai/agents';
import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { Bot } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import Shell from '@groam/ui/components/shell/client';
import { AgentRunList } from '@/features/agents/agent-run/agent-run-list';
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
            <Link to="/">Back to Home</Link>
          </Button>
        }
        description="This workspace only has chat, issue, and idea-review agents."
        headline="Agent not found"
        icon={Bot}
      />
    );
  }

  return (
    <Shell>
      <Shell.BannerLayout>
        {showLoading || !agent ? (
          <AgentDetailHeader isLoading />
        ) : (
          <AgentDetailHeader agent={agent} />
        )}
        <Shell.PageBody>
          <Shell.Section stack="sm">
            <Shell.SectionHeader density="compact" title="Runs" />
            <AgentRunList isLoading={showRunsLoading} runs={runs} />
            {!showRunsLoading && (status === 'CanLoadMore' || status === 'LoadingMore') ? (
              <div className="flex justify-center">
                <Button
                  onClick={() => loadMore(20)}
                  pending={status === 'LoadingMore'}
                  variant="outline"
                >
                  Load more runs
                </Button>
              </div>
            ) : null}
          </Shell.Section>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
