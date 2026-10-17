import type { UIMessage } from '@convex-dev/agent/react';
import { parseAssistantGeneratedForm } from '#ai/ui/form/assistant-generated-form-parser';
import type { ActivityPresentation } from '#ai/ui/tool-calls/assistant-tool-call-types';
import { toolCallPresentations } from '#ai/ui/tool-calls/tool-call-presentations';

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
