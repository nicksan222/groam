import { Button } from '@groam/ui/components/button';
import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { Sparkles } from 'lucide-react';
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
      className="size-9 touch-manipulation rounded-full"
      disabled={disabled || api.isSubmitting || mentioned}
      onClick={() => api.setText(insertAgentMention(api.text))}
      size="icon"
      title={mentioned ? 'Groam is tagged' : 'Ask Groam'}
      type="button"
      variant="ghost"
    >
      <Sparkles className={mentioned ? 'size-[1.125rem] text-foreground' : 'size-[1.125rem]'} />
    </Button>
  );
}
