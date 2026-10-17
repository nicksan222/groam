import type { UIMessage } from '@convex-dev/agent/react';
import { parseAssistantGeneratedForm } from '#ai/ui/form/assistant-generated-form-parser';
import type { ActivityPresentation } from '#ai/ui/tool-calls/assistant-tool-call-types';
import { AssistantToolCalls, toolCallPresentations } from '#ai/ui/tool-calls/assistant-tool-calls';
import { assistantSources } from './assistant-source';
import { AssistantSources } from './assistant-sources';
import { CopyResponseButton } from './copy-response-button';

export type { ActivityPresentation };

/** The tool steps Groam took for a message, in call order, as activity rows. */
export function assistantRunActivities(message: UIMessage): ActivityPresentation[] {
  const settled = message.status !== 'streaming' && message.status !== 'pending';
  return toolCallPresentations(message.parts, { kind: 'activity', settled }).flatMap(
    ({ presentation }) => (presentation.kind === 'activity' ? [presentation] : [])
  );
}

/** The prose of a reply, without any generated form source. */
export function assistantReplyText(text: string): string {
  return parseAssistantGeneratedForm(text)?.prose ?? text;
}

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
