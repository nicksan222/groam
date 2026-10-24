import { RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { agentRunCopy } from '#ai/backend/runs/copy';

/** `onRetry` reports its own failure (the run controls toast it); this only guards and shows pending. */
export function AgentRetryFromZeroButton({
  onRetry,
  testId
}: {
  onRetry: () => Promise<unknown> | unknown;
  testId?: string;
}) {
  const { isPending, run } = useAsyncAction();

  return (
    <Button
      aria-label={agentRunCopy.retryFromZero}
      className="rounded-full"
      data-testid={testId}
      onClick={() => void run(async () => onRetry())}
      pending={isPending}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <RotateCcw aria-hidden />
    </Button>
  );
}
