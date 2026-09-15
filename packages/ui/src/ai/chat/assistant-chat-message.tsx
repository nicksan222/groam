import type { UIMessage } from '@convex-dev/agent/react';
import { type AssistantMessageKind, assistantMessageStrategies } from '#src/ai/messages';
import type { Reply } from '#tsx/ai/messages/message-presentation';

export type { Reply };

export function AssistantChatMessage({
  choiceResponses,
  disabled,
  formSubmitted = false,
  formValues,
  message,
  onReply,
  onResend,
  resendDisabled
}: {
  choiceResponses?: Record<string, string>;
  disabled: boolean;
  formSubmitted?: boolean;
  formValues?: Record<string, unknown>;
  message: UIMessage;
  onReply?: Reply;
  onResend?: () => Promise<boolean>;
  resendDisabled?: boolean;
}) {
  const kind: AssistantMessageKind =
    message.role === 'user' || message.role === 'system' ? message.role : 'assistant';
  const MessageKind = assistantMessageStrategies[kind];

  return (
    <MessageKind
      choiceResponses={choiceResponses}
      disabled={disabled}
      formSubmitted={formSubmitted}
      formValues={formValues}
      message={message}
      onReply={onReply}
      onResend={onResend}
      resendDisabled={resendDisabled}
    />
  );
}
