import { agentRunCopy, presentAgentRunMessage } from '@groam/ai-contracts/agents/runs/copy';
import { type AgentRunStatus, RUN_STATUS_LABEL } from '@groam/ai-contracts/agents/runs/ids';
import { canRetryAgentRunFromZero, isActiveAgentRun } from '@groam/ai-contracts/agents/runs/roster';
import { Button } from '@groam/ui/components/button';
import PulsingDot from '@groam/ui/components/pulsing-dot';
import { cn } from '@groam/ui/lib/utils';
import { Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import { AgentRetryFromZeroButton } from './agent-retry-from-zero';

export type AgentRunBannerEvent = {
  id: string;
  label: string;
};

export type AgentRunBannerRun = {
  error?: string | null;
  headline: string | null;
  id: string;
  issueId?: string | null;
  status: AgentRunStatus;
};

export function AgentRunBanner({
  agentLabel,
  events,
  eventTestId,
  onRetry,
  onStop,
  retryTestId,
  run,
  stopTestId,
  testId,
  viewAgent
}: {
  agentLabel: string;
  events: readonly AgentRunBannerEvent[];
  eventTestId?: string;
  onRetry?: () => Promise<unknown> | unknown;
  onStop?: () => void;
  retryTestId?: string;
  run: AgentRunBannerRun;
  stopTestId?: string;
  testId?: string;
  viewAgent: ReactNode;
}) {
  const working = isActiveAgentRun(run);
  const canRetry = onRetry != null && canRetryAgentRunFromZero(run);
  const activity = bannerActivity(run, events);
  const statusTone = statusTextClass(run.status);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5',
        working
          ? 'border-primary/25 bg-primary/5'
          : run.status === 'failed'
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-border/80 bg-muted/20'
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md',
            working ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {working ? <PulsingDot color="primary" /> : <Bot className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
            <span className="font-medium text-foreground">{agentLabel}</span>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span className={cn('text-xs font-medium', statusTone)}>
              {RUN_STATUS_LABEL[run.status]}
            </span>
          </p>
          {activity ? (
            <p
              className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground"
              data-testid={eventTestId}
            >
              {activity}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {working ? (
          <Button data-testid={stopTestId} onClick={onStop} size="xs" variant="outline">
            {agentRunCopy.stop}
          </Button>
        ) : null}
        {canRetry ? <AgentRetryFromZeroButton onRetry={onRetry} testId={retryTestId} /> : null}
        <Button asChild size="xs" variant="default">
          {viewAgent}
        </Button>
      </div>
    </div>
  );
}

function statusTextClass(status: AgentRunStatus): string {
  if (status === 'failed') return 'text-destructive';
  if (status === 'running' || status === 'queued') return 'text-primary';
  return 'text-muted-foreground';
}

function bannerActivity(
  run: AgentRunBannerRun,
  events: readonly AgentRunBannerEvent[]
): string | null {
  const presented = presentAgentRunMessage(run);
  const latest = events.at(-1)?.label?.trim();
  if (run.status === 'failed' && run.error?.trim()) return presented;
  if (latest) return latest;
  return presented.trim() ? presented : null;
}
