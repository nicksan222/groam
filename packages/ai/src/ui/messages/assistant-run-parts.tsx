import type { UIMessage } from '@convex-dev/agent/react';
import { AssistantToolCalls } from '#ai/ui/tool-calls/assistant-tool-calls';
import { assistantSources } from './assistant-source';
import { AssistantSources } from './assistant-sources';
import { CopyResponseButton } from './copy-response-button';

/** Sources, choice prompts, and copy for a finished reply. */
export function AssistantReplyExtras({
  disabled = true,
  message,
  text
}: {
  disabled?: boolean;
  message: UIMessage;
  text: string;
}) {
  const sources = assistantSources(message.parts);
  return (
    <>
      {sources.length > 0 ? <AssistantSources sources={sources} /> : null}
      <AssistantToolCalls disabled={disabled} kind="choice" parts={message.parts} settled />
      {message.status === 'success' && text ? (
        <div className="mt-1 flex justify-end">
          <CopyResponseButton text={text} />
        </div>
      ) : null}
    </>
  );
}
