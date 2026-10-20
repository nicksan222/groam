import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { SuggestRow } from '@groam/ui/components/suggest-row';
import { AtSign } from 'lucide-react';
import {
  AGENT_MENTION_TOKEN,
  agentMentionQuery,
  hasAgentMention,
  replaceAgentMentionQuery
} from '@/features/discussions/agent-mention-controls/agent-mention';

export function AgentMentionSuggest({
  api,
  disabled = false
}: {
  api: MessageComposerApi;
  disabled?: boolean;
}) {
  const caret = api.text.length;
  const query = agentMentionQuery(api.text, caret);
  if (query === null || hasAgentMention(api.text)) return null;
  return (
    <SuggestRow
      description="Ask Groam — reply visible to everyone"
      disabled={disabled || api.isSubmitting}
      icon={<AtSign aria-hidden="true" className="size-4 text-muted-foreground" />}
      onSelect={() => {
        const next = replaceAgentMentionQuery(api.text, caret);
        api.setText(next.text);
      }}
      title={AGENT_MENTION_TOKEN}
    />
  );
}
