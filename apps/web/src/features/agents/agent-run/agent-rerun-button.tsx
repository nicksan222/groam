import { agentRunCopy } from '@groam/ai-contracts/agents/runs/copy';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function AgentRerunButton({
  label = agentRunCopy.rerun,
  onRerun,
  testId
}: {
  label?: string;
  onRerun: () => Promise<unknown> | unknown;
  testId?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      aria-busy={pending}
      data-testid={testId}
      disabled={pending}
      onClick={() => {
        void (async () => {
          setPending(true);
          try {
            await onRerun();
          } finally {
            setPending(false);
          }
        })();
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? <Spinner /> : <RotateCcw />}
      {label}
    </Button>
  );
}
