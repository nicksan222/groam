import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Bot } from 'lucide-react';
import { AgentRunTable } from '@/features/agents/agent-run/agent-run-table';
import { useWorkspaceAgentRuns } from '@/features/agents/hooks/use-workspace-agent-runs';
import { PaginatedListContent } from '@/features/workspace/workspace-list/paginated-list-content';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';

export function AgentsListView() {
  const { isLoading, loadMore, runs, status } = useWorkspaceAgentRuns();
  const { activeOrganization } = useWorkspace();

  useSetAgentContext({
    capabilities: [],
    data: {
      activeGroup: activeOrganization.name,
      runs: runs.map((run) => ({
        agentId: run.agentId,
        status: run.status,
        title: run.title
      }))
    },
    description: 'Summarize recent agent runs in this group, newest first.',
    key: 'agents:list',
    title: 'Background activity'
  });

  if (isLoading) return <PageLoading label="Loading agent runs…" />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.agentsTitle}>Background activity</Shell.Title>
        <Shell.Description>
          Work Groam is doing for your group. Continue planning in chat while it runs.
        </Shell.Description>
      </Shell.Header>
      <Shell.Content>
        <PaginatedListContent
          empty={
            <EmptyScreen
              border
              description="Assign an issue, start a chat, or request an idea review to see activity here."
              headline="Nothing running yet"
              icon={Bot}
            />
          }
          isEmpty={!isLoading && runs.length === 0}
          loadMoreLabel="Load more runs"
          loadMoreTestId={testIds.agentsLoadMore}
          onLoadMore={loadMore}
          status={status}
        >
          <AgentRunTable isLoading={isLoading} runs={runs} />
        </PaginatedListContent>
      </Shell.Content>
    </Shell>
  );
}
