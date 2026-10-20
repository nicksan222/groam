import { Slash } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { testIds } from '@/lib/test-ids';

/** Opens the "/" command list; only from an empty composer so a draft is never overwritten. */
export function ComposerCommandButton({ api }: { api: MessageComposerApi }) {
  const busy = api.text.length > 0;
  return (
    <Button
      aria-label="Commands"
      className="size-9 touch-manipulation rounded-full"
      data-testid={testIds.composerCommandButton}
      disabled={api.isSubmitting || busy}
      onClick={() => api.insertText('/')}
      size="icon"
      title={busy ? 'Clear the message to use a command' : 'Commands'}
      type="button"
      variant="ghost"
    >
      <Slash className="size-[1.125rem]" />
    </Button>
  );
}
