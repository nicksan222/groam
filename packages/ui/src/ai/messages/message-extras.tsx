import type { UIMessage } from '@convex-dev/agent/react';
import { AssistantToolCalls } from '#tsx/ai/tool-calls/assistant-tool-calls';
import type { AssistantSource } from './assistant-source';
import { AssistantSources } from './assistant-sources';
import { CopyResponseButton } from './copy-response-button';
import type { Reply } from './types';

export function MessageExtras({
  choiceResponses,
  disabled,
  displayedText,
  isUser,
  message,
  onReply,
  sources,
  suppressChoices
}: {
  choiceResponses?: Record<string, string>;
  disabled: boolean;
  displayedText: string;
  isUser: boolean;
  message: UIMessage;
  onReply?: Reply;
  sources: AssistantSource[];
  suppressChoices: boolean;
}) {
  if (isUser) {
    return message.status === 'pending' ? (
      <span className="mt-1 block px-1 text-right text-[10px] text-muted-foreground" role="status">
        Sending…
      </span>
    ) : null;
  }
  return (
    <>
      {sources.length > 0 && <AssistantSources sources={sources} />}
      {message.status === 'success' && displayedText && <CopyResponseButton text={displayedText} />}
      <AssistantToolCalls
        disabled={disabled}
        onReply={onReply}
        parts={message.parts}
        selectedChoices={choiceResponses}
        suppressChoices={suppressChoices}
      />
    </>
  );
}
