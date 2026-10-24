import { AtSign } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { type ComposerValue, useComposerContext } from '@groam/ui/components/composer';
import {
  hasAgentMentionValue,
  insertAgentMentionValue
} from '@/features/discussions/agent-mention-controls/agent-mention';

/** Tags Groam in the draft as an @groam token; render inside a Composer. */
export function AskGroamButton({
  disabled = false,
  onValueChange
}: {
  disabled?: boolean;
  onValueChange: (value: ComposerValue) => void;
}) {
  const composer = useComposerContext();
  const mentioned = hasAgentMentionValue(composer.value);
  return (
    <Button
      aria-label={mentioned ? 'Groam already tagged' : 'Ask Groam'}
      aria-pressed={mentioned}
      className="h-9 touch-manipulation px-2 text-muted-foreground"
      disabled={disabled || composer.disabled || composer.readOnly || mentioned}
      onClick={() => onValueChange(insertAgentMentionValue(composer.value))}
      size="sm"
      title={mentioned ? 'Groam is tagged' : 'Tag Groam to ask for help'}
      type="button"
      variant="ghost"
    >
      <AtSign aria-hidden="true" className="size-4 sm:hidden" />
      <span aria-hidden className="hidden sm:inline">
        @Groam
      </span>
    </Button>
  );
}
