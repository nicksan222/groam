import { agentRunCopy } from '@groam/ai-contracts/agents/runs/copy';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function AgentRetryFromZeroButton({
  onRetry,
  testId
}: {
  onRetry: () => Promise<unknown> | unknown;
  testId?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      aria-label={agentRunCopy.retryFromZero}
      className="rounded-full"
      data-testid={testId}
      disabled={pending}
      onClick={() => {
        void (async () => {
          setPending(true);
          try {
            await onRetry();
          } finally {
            setPending(false);
          }
        })();
      }}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {pending ? <Spinner /> : <RotateCcw />}
    </Button>
  );
}
