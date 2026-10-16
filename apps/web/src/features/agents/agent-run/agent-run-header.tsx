import { agentRunTime } from '@groam/ai/backend/runs/time';
import Shell from '@groam/ui/components/shell/client';
import { Bot } from 'lucide-react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunStatusBadge } from './agent-run-status-badge';

function agentRunSurfaceLabel(run: AgentRun) {
  if (run.agentId === 'reviewer') return 'Idea review';
  return run.surface === 'chat' ? 'Conversation' : 'Issue resolution';
}

/** Title, status, and the started-by line; mirrors the issue banner. */
export function AgentRunHeader({ run }: { run: AgentRun }) {
  const startedAt = run.startedAt ?? run.updatedAt;
  return (
    <>
      <Shell.Title
        className="min-w-0 break-words [overflow-wrap:anywhere]"
        data-testid={testIds.agentRunTitle}
      >
        {run.title}
        <span className="ml-2 font-normal text-muted-foreground">#{run.shortId ?? run.id}</span>
      </Shell.Title>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span aria-live="polite">
          <AgentRunStatusBadge status={run.status} />
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bot aria-hidden className="size-3.5" />
          {agentRunSurfaceLabel(run)}
        </span>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          · {run.kickoff === 'queue' ? 'queued' : 'started'} by{' '}
          <span className="font-medium text-foreground">{run.createdBy.name}</span>
          {' · '}
          <time dateTime={new Date(startedAt).toISOString()}>{agentRunTime(startedAt)}</time>
        </p>
      </div>
    </>
  );
}
