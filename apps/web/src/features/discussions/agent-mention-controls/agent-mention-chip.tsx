import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { RemovableChip } from '@groam/ui/components/removable-chip';
import { Sparkles } from 'lucide-react';
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
    <RemovableChip
      disabled={disabled || api.isSubmitting}
      icon={Sparkles}
      label={AGENT_MENTION_TOKEN}
      onRemove={() => api.setText(removeAgentMention(api.text))}
      removeLabel="Remove @groam"
      title="Groam will reply in this chat"
    />
  );
}
