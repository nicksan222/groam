import { Bot, Hourglass } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { IconTile } from '@groam/ui/components/icon-tile';
import PulsingDot from '@groam/ui/components/pulsing-dot';
import { toast } from '@groam/ui/components/toast';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { agentRunCopy, presentAgentRunMessage } from '#ai/backend/runs/copy';
import { type AgentRunStatus, RUN_STATUS_LABEL } from '#ai/backend/runs/ids';
import { canRetryAgentRunFromZero, isActiveAgentRun } from '#ai/backend/runs/roster';
import { AgentRetryFromZeroButton } from './agent-retry-from-zero';
import { type AgentRunBannerWait, AgentRunWait } from './agent-run-wait';

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
  cancelWaitTestId,
  events,
  eventTestId,
  onCancelWait,
  onRetry,
  onStop,
  retryTestId,
  run,
  stopTestId,
  testId,
  viewAgent,
  wait
}: {
  agentLabel: string;
  cancelWaitTestId?: string;
  events: readonly AgentRunBannerEvent[];
  eventTestId?: string;
  /** Resolves the wait as cancelled; the run resumes and wraps up (Stop ends it instead). */
  onCancelWait?: () => Promise<unknown>;
  onRetry?: () => Promise<unknown> | unknown;
  onStop?: () => Promise<unknown>;
  retryTestId?: string;
  run: AgentRunBannerRun;
  stopTestId?: string;
  testId?: string;
  viewAgent: ReactNode;
  /** What a `waiting` run waits for; ignored for any other status. */
  wait?: AgentRunBannerWait | null;
}) {
  const { isPending: stopping, run: runStop } = useAsyncAction({
    fallbackError: 'Couldn’t stop the run. Try again.',
    onError: (message) => toast.error(message)
  });
  const working = isActiveAgentRun(run);
  const canRetry = onRetry != null && canRetryAgentRunFromZero(run);
  const waiting = waitingOn(run, wait);
  const activity = bannerActivity(run, events, waiting);
  const statusTone = statusTextClass(run.status);

  return (
    <div className="expand-in">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border px-3 py-3',
          working
            ? 'border-primary/25 bg-primary/5'
            : run.status === 'failed'
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border/80 bg-muted/20'
        )}
        data-testid={testId}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconTile
            aria-hidden
            className={cn('mt-1', working && 'bg-primary/15')}
            radius="md"
            size="xs"
            variant={working ? 'primary' : 'muted'}
          >
            {bannerIcon(run.status, working)}
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
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
                className="mt-1 min-w-0 truncate text-xs text-muted-foreground"
                data-testid={eventTestId}
              >
                {activity}
              </p>
            ) : null}
            {waiting ? (
              <AgentRunWait
                cancelTestId={cancelWaitTestId}
                onCancel={onCancelWait}
                wait={waiting}
              />
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {working && onStop ? (
            <Button
              data-testid={stopTestId}
              onClick={() => void runStop(async () => onStop())}
              pending={stopping}
              size="xs"
              variant="outline"
            >
              {agentRunCopy.stop}
            </Button>
          ) : null}
          {canRetry ? <AgentRetryFromZeroButton onRetry={onRetry} testId={retryTestId} /> : null}
          <Button asChild size="xs" variant="default">
            {viewAgent}
          </Button>
        </div>
      </div>
    </div>
  );
}

function statusTextClass(status: AgentRunStatus): string {
  if (status === 'failed') return 'text-destructive';
  if (status === 'running' || status === 'queued' || status === 'waiting') return 'text-primary';
  return 'text-muted-foreground';
}

/** The wait to show: only a `waiting` run has one. */
function waitingOn(
  run: AgentRunBannerRun,
  wait: AgentRunBannerWait | null | undefined
): AgentRunBannerWait | null {
  return run.status === 'waiting' && wait ? wait : null;
}

function bannerIcon(status: AgentRunStatus, working: boolean): ReactNode {
  if (status === 'waiting') return <Hourglass className="size-3.5" />;
  return working ? <PulsingDot color="primary" /> : <Bot className="size-3.5" />;
}

function bannerActivity(
  run: AgentRunBannerRun,
  events: readonly AgentRunBannerEvent[],
  wait: AgentRunBannerWait | null
): string | null {
  if (wait) return `${agentRunCopy.waitingFor} ${wait.label}`;
  const presented = presentAgentRunMessage(run);
  const latest = events.at(-1)?.label?.trim();
  if (run.status === 'failed' && run.error?.trim()) return presented;
  if (latest) return latest;
  return presented.trim() ? presented : null;
}
