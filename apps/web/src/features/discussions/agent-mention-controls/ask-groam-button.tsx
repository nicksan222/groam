import { AtSign } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import {
  hasAgentMention,
  insertAgentMention
} from '@/features/discussions/agent-mention-controls/agent-mention';

export function AskGroamButton({
  api,
  disabled = false
}: {
  api: MessageComposerApi;
  disabled?: boolean;
}) {
  const mentioned = hasAgentMention(api.text);
  return (
    <Button
      aria-label={mentioned ? 'Groam already tagged' : 'Ask Groam'}
      aria-pressed={mentioned}
      className="h-9 touch-manipulation px-2 text-muted-foreground"
      disabled={disabled || api.isSubmitting || mentioned}
      onClick={() => api.setText(insertAgentMention(api.text))}
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
