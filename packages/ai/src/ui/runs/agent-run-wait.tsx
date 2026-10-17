import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
import { useState } from 'react';
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
  onCancel?: () => Promise<unknown>;
  wait: AgentRunBannerWait;
}) {
  const [cancelling, setCancelling] = useState(false);
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
          aria-busy={cancelling}
          className="-my-1"
          data-testid={cancelTestId}
          disabled={cancelling}
          onClick={async () => {
            setCancelling(true);
            try {
              await onCancel();
            } catch (error: unknown) {
              toast.error(errorMessage(error, 'Unable to cancel this wait'));
            } finally {
              setCancelling(false);
            }
          }}
          size="xs"
          variant="ghost"
        >
          {cancelling ? <Spinner aria-hidden /> : null}
          {agentRunCopy.cancelWait}
        </Button>
      ) : null}
    </div>
  );
}
