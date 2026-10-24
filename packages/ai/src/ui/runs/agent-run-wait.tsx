import { Button } from '@groam/ui/components/button';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { agentRunCopy } from '#ai/backend/runs/copy';

export type AgentRunBannerWait = { deadlineAt: number; label: string; progress: string | null };

const deadlineFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

/** A waiting run's progress, deadline, and cancel control (the banner names what it waits for). */
export function AgentRunWait({
  cancelTestId,
  onCancel,
  wait
}: {
  cancelTestId?: string;
  /** Reports its own failure (e.g. a toast); this only guards and shows pending. */
  onCancel?: () => Promise<unknown>;
  wait: AgentRunBannerWait;
}) {
  const { isPending: cancelling, run } = useAsyncAction();
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2" role="status">
        {wait.progress ? (
          <span className="font-medium text-foreground">{wait.progress}</span>
        ) : null}
        <span>until {deadlineFormat.format(wait.deadlineAt)}</span>
      </span>
      {onCancel ? (
        <Button
          className="-my-1"
          data-testid={cancelTestId}
          onClick={() => void run(async () => onCancel())}
          pending={cancelling}
          size="xs"
          variant="ghost"
        >
          {agentRunCopy.cancelWait}
        </Button>
      ) : null}
    </div>
  );
}
