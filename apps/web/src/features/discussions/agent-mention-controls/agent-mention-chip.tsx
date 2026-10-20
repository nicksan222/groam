import { Button } from '@groam/ui/components/button';
import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { X } from 'lucide-react';
import {
  AGENT_MENTION_TOKEN,
  hasAgentMention,
  removeAgentMention
} from '@/features/discussions/agent-mention-controls/agent-mention';

export function AgentMentionChip({
  api,
  disabled = false
}: {
  api: MessageComposerApi;
  disabled?: boolean;
}) {
  if (!hasAgentMention(api.text)) return null;
  return (
    <div
      className="flex items-center gap-1 px-3 text-xs text-muted-foreground"
      title="Groam will reply in this chat"
    >
      <span>{AGENT_MENTION_TOKEN}</span>
      <Button
        aria-label="Remove @groam"
        className="size-7 text-muted-foreground"
        disabled={disabled || api.isSubmitting}
        onClick={() => api.setText(removeAgentMention(api.text))}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
