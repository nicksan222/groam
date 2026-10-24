import { Slash } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useComposerContext } from '@groam/ui/components/composer';
import { testIds } from '@/lib/test-ids';

/**
 * Types "/" to open the command suggestions; only from an empty composer so a draft is never
 * turned into a command. Render inside a Composer that has a "/" trigger.
 */
export function ComposerCommandButton() {
  const composer = useComposerContext();
  const busy = !composer.isEmpty;
  return (
    <Button
      aria-label="Commands"
      className="size-9 touch-manipulation rounded-full"
      data-testid={testIds.composerCommandButton}
      disabled={composer.disabled || composer.readOnly || busy}
      onClick={() => composer.insertTrigger('/')}
      size="icon"
      title={busy ? 'Clear the message to use a command' : 'Commands'}
      type="button"
      variant="ghost"
    >
      <Slash className="size-[1.125rem]" />
    </Button>
  );
}
