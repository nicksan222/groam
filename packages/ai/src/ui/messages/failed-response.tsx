import { CircleAlert, RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { ErrorWell } from '@groam/ui/components/error-well';
import { IconTile } from '@groam/ui/components/icon-tile';
import { assistantFailureMessage } from '#ai/backend/errors';

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
    <ErrorWell className="mt-2" role="status" size="inline">
      <IconTile radius="full" size="xs" variant="destructive">
        <CircleAlert className="size-3.5" />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block">{assistantFailureMessage(error)}</span>
        {onResend && (
          <Button
            className="mt-2 h-7 rounded-lg border-destructive/20 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
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
    </ErrorWell>
  );
}
