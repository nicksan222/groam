import { assistantAgents, isAssistantAgentId } from '@groam/ai/agents';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { ArrowRight } from '@groam/icons';
import { agentRunHref } from '@/features/agents/agent-run/agent-run-href';
import { AgentRunStatusBadge } from '@/features/agents/agent-run/agent-run-status-badge';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { Link } from '@/features/workspace/navigation/router';

function agentRunAgentName(agentId: WorkspaceAgentRun['agentId']) {
  return isAssistantAgentId(agentId) ? assistantAgents[agentId].label : agentId;
}

export function AgentRunRow({ run, testId }: { run: WorkspaceAgentRun; testId: string }) {
  return (
    <Link
      className="group flex min-w-0 items-center justify-between gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/60"
      data-testid={testId}
      {...agentRunHref(run.agentId, run.id)}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-muted-foreground">
          {agentRunAgentName(run.agentId)} · {agentRunTime(run.updatedAt)}
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-foreground">
          {run.title}
        </span>
        {run.headline ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {run.headline}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <AgentRunStatusBadge status={run.status} />
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
    </Link>
  );
}
