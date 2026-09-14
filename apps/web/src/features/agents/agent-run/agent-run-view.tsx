import { isAssistantAgentId } from '@groam/ai-contracts/agents/registry';
import type { Id } from '@groam/backend/data-model';
import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useNavigate } from '@tanstack/react-router';
import { Bot } from 'lucide-react';
import { useAgentRecord } from '@/features/agents/hooks/use-agent';
import {
  useAgentRun,
  useAgentRunControls,
  useAgentRunEvents,
  useStartQueuedAssignRuns
} from '@/features/agents/hooks/use-agent-run';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { AgentRunDetail } from './agent-run-detail';
import { AgentRunHeader } from './agent-run-header';
import { agentHref, agentRunHref } from './agent-run-href';

export function AgentRunView({ agentId, runId }: { agentId: string; runId: string }) {
  const validId = isAssistantAgentId(agentId) ? agentId : undefined;
  const navigate = useNavigate();
  const agent = useAgentRecord(validId);
  const run = useAgentRun(runId as Id<'agentRuns'>);
  const { activeOrganization } = useWorkspace();
  const { retry, stop } = useAgentRunControls();
  const matched = run && validId && run.agentId === validId ? run : undefined;
  useStartQueuedAssignRuns(matched ? [matched] : undefined);
  const { events, loadMore, status: eventsStatus } = useAgentRunEvents(matched?.id);
  const showLoading = validId !== undefined && (agent === undefined || run === undefined);

  useSetAgentContext(
    agent && matched
      ? {
          capabilities: [],
          data: {
            activeGroup: activeOrganization.name,
            agentId: agent.id,
            runId: matched.id,
            status: matched.status,
            surface: agent.surface
          },
          description:
            'Inspect the run outcome, related idea, report, caller, and recorded activity.',
          key: `agents:${agent.id}:${matched.id}`,
          title: matched.title
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

  if (showLoading) return <PageLoading label="Loading run…" />;

  if (!(agent && matched)) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/agents">Back to agents</Link>
          </Button>
        }
        description="This run is missing, or it belongs to a different agent."
        headline="Run not found"
        icon={Bot}
      />
    );
  }

  return (
    <Shell>
      <Shell.Header>
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4">
          <PageCrumbNav
            crumbs={[
              {
                asChild: true,
                children: <Link {...agentHref(agent.id)} />,
                label: agent.label
              }
            ]}
            inset={false}
            parent={{
              asChild: true,
              children: <Link to="/agents" />,
              label: 'All agents'
            }}
          />
          <AgentRunHeader
            onRetry={async (id) => {
              const nextRunId = await retry({ runId: id });
              if (!nextRunId) return;
              await navigate(agentRunHref(agent.id, nextRunId));
            }}
            onStop={(id) => stop({ runId: id })}
            run={matched}
          />
        </div>
      </Shell.Header>
      <Shell.Content>
        <Shell.PageStack>
          <div className="mx-auto w-full max-w-7xl" data-testid={testIds.agentDetailWorkspace}>
            <AgentRunDetail
              key={matched.id}
              events={events}
              eventsStatus={eventsStatus}
              onLoadEarlier={() => loadMore(40)}
              run={matched}
            />
          </div>
        </Shell.PageStack>
      </Shell.Content>
    </Shell>
  );
}
