import { isAssistantAgentId } from '@groam/ai/agents';
import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useNavigate } from '@tanstack/react-router';
import { Bot } from 'lucide-react';
import { useMemo } from 'react';
import { type AgentRun, useAgentRecord } from '@/features/agents/hooks/use-agent';
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
  const startable = useMemo(() => (matched ? [matched] : undefined), [matched]);
  useStartQueuedAssignRuns(startable);
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

  const onRetry = async (id: AgentRun['id']) => {
    const nextRunId = await retry({ runId: id });
    if (!nextRunId) return;
    await navigate(agentRunHref(agent.id, nextRunId));
  };

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Banner className="border-b border-border/40">
          <Shell.BannerInset className="flex min-w-0 flex-col gap-1.5 py-2.5 sm:py-3">
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
            <AgentRunHeader run={matched} />
          </Shell.BannerInset>
        </Shell.Banner>
        <Shell.PageBody maxWidthClassName="max-w-[1600px]" variant="detail">
          <div className="min-w-0" data-testid={testIds.agentDetailWorkspace}>
            <AgentRunDetail
              key={matched.id}
              agentLabel={agent.label}
              events={events}
              eventsStatus={eventsStatus}
              onLoadEarlier={() => loadMore(40)}
              onRetry={onRetry}
              onStop={(id) => stop({ runId: id })}
              run={matched}
            />
          </div>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}
