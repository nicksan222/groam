import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Bot } from 'lucide-react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunStatusBadge } from './agent-run-status-badge';
import { AgentRunToolbar } from './agent-run-toolbar';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AgentRunHeaderProps = {
  isLoading?: boolean;
  onRetry?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  onStop?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  run?: AgentRun;
};

export function AgentRunHeader({ isLoading, onRetry, onStop, run }: AgentRunHeaderProps) {
  if (isLoading || !run) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-[min(100%,32rem)]" />
        <Skeleton className="h-4 w-56" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Bot aria-hidden className="size-4" />
          {run.agentId === 'reviewer'
            ? 'Idea review'
            : run.surface === 'chat'
              ? 'Conversation'
              : 'Issue resolution'}
        </span>
        <span aria-hidden className="h-3 w-px bg-border" />
        <span aria-live="polite">
          <AgentRunStatusBadge status={run.status} />
        </span>
      </div>
      <div className="flex min-w-0 flex-col items-start justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Shell.Title
            className="break-words text-2xl leading-tight tracking-tight [overflow-wrap:anywhere] md:text-2xl"
            data-testid={testIds.agentRunTitle}
          >
            {run.title}
          </Shell.Title>
          <p className="text-sm text-muted-foreground">Run overview, results, and activity.</p>
        </div>
        {onRetry ? <AgentRunToolbar onRetry={onRetry} onStop={onStop} run={run} /> : null}
      </div>
    </div>
  );
}
