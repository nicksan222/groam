import { agentRunCopy } from '@groam/ai/backend/runs/copy';
import { RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';

/** `onRerun` reports its own failure (the run controls toast it); this only guards and shows pending. */
export function AgentRerunButton({
  label = agentRunCopy.rerun,
  onRerun,
  testId
}: {
  label?: string;
  onRerun: () => Promise<unknown> | unknown;
  testId?: string;
}) {
  const { isPending, run } = useAsyncAction();

  return (
    <Button
      data-testid={testId}
      onClick={() => void run(async () => onRerun())}
      pending={isPending}
      size="sm"
      type="button"
      variant="outline"
    >
      <RotateCcw aria-hidden />
      {label}
    </Button>
  );
}
