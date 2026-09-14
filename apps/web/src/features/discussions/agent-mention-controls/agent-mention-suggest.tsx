import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { SuggestRow } from '@groam/ui/components/suggest-row';
import { Sparkles } from 'lucide-react';
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
      icon={
        <span className="grid size-8 place-items-center rounded-full bg-muted">
          <Sparkles className="size-3.5" />
        </span>
      }
      onSelect={() => {
        const next = replaceAgentMentionQuery(api.text, caret);
        api.setText(next.text);
      }}
      title={AGENT_MENTION_TOKEN}
    />
  );
}
