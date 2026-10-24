import { X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { type ComposerValue, useComposerContext } from '@groam/ui/components/composer';
import {
  AGENT_MENTION_TOKEN,
  hasAgentMentionValue,
  removeAgentMentionValue
} from '@/features/discussions/agent-mention-controls/agent-mention';

/** Shows that the draft tags Groam, with a control to untag it; render inside a Composer. */
export function AgentMentionChip({
  disabled = false,
  onValueChange
}: {
  disabled?: boolean;
  onValueChange: (value: ComposerValue) => void;
}) {
  const composer = useComposerContext();
  if (!hasAgentMentionValue(composer.value)) return null;
  return (
    <div
      className="flex items-center gap-1 px-3 text-xs text-muted-foreground"
      title="Groam will reply in this chat"
    >
      <span>{AGENT_MENTION_TOKEN}</span>
      <Button
        aria-label="Remove @groam"
        className="size-7 text-muted-foreground"
        disabled={disabled || composer.disabled || composer.readOnly}
        onClick={() => onValueChange(removeAgentMentionValue(composer.value))}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
