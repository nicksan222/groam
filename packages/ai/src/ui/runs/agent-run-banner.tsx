import { Button } from '@groam/ui/components/button';
import PulsingDot from '@groam/ui/components/pulsing-dot';
import { Spinner } from '@groam/ui/components/spinner';
import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
import { cn } from '@groam/ui/lib/utils';
import { Bot, Hourglass } from 'lucide-react';
import { type ReactNode, useState } from 'react';
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
  const [stopping, setStopping] = useState(false);
  const working = isActiveAgentRun(run);
  const canRetry = onRetry != null && canRetryAgentRunFromZero(run);
  const waiting = waitingOn(run, wait);
  const activity = bannerActivity(run, events, waiting);
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
          {bannerIcon(run.status, working)}
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
          {waiting ? (
            <AgentRunWait cancelTestId={cancelWaitTestId} onCancel={onCancelWait} wait={waiting} />
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {working && onStop ? (
          <Button
            aria-busy={stopping}
            data-testid={stopTestId}
            disabled={stopping}
            onClick={async () => {
              setStopping(true);
              try {
                await onStop();
              } catch (error: unknown) {
                toast.error(errorMessage(error, 'Unable to stop this run'));
              } finally {
                setStopping(false);
              }
            }}
            size="xs"
            variant="outline"
          >
            {stopping ? <Spinner aria-hidden /> : null}
            {stopping ? 'Stopping…' : agentRunCopy.stop}
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
