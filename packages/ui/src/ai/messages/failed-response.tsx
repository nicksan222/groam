import { assistantFailureMessage } from '@groam/ai-contracts/errors';
import { Button } from '@groam/ui/components/button';
import { CircleAlert, RotateCcw } from 'lucide-react';

export function FailedResponse({
  disabled,
  error,
  onResend
}: {
  disabled: boolean;
  error?: unknown;
  onResend?: () => Promise<boolean>;
}) {
  return (
    <span
      className="mt-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-xs text-destructive"
      role="alert"
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-destructive/10">
        <CircleAlert className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{assistantFailureMessage(error)}</span>
        {onResend && (
          <Button
            className="mt-1.5 h-7 rounded-lg border-destructive/20 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={disabled}
            onClick={() => void onResend()}
            size="xs"
            type="button"
            variant="outline"
          >
            <RotateCcw className="size-3" /> Resend message
          </Button>
        )}
      </span>
    </span>
  );
}
