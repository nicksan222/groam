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
      className="h-9 touch-manipulation gap-1.5 rounded-full px-2.5 sm:px-3"
      disabled={disabled || api.isSubmitting || mentioned}
      onClick={() => api.setText(insertAgentMention(api.text))}
      size="sm"
      title={mentioned ? 'Groam is tagged' : 'Tag Groam to ask for help'}
      type="button"
      variant="outline"
    >
      <Sparkles className={mentioned ? 'size-4 text-foreground' : 'size-4'} />
      <span aria-hidden className="hidden sm:inline">
        @Groam
      </span>
    </Button>
  );
}
