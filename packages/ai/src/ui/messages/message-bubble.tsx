import type { UIMessage } from '@convex-dev/agent/react';
import { ChatMessageBubble } from '@groam/ui/components/chat';
import { Markdown } from '@groam/ui/components/markdown';
import { AssistantGeneratedForm } from '#ai/ui/form/assistant-generated-form';
import type { ParsedAssistantForm } from '#ai/ui/form/assistant-generated-form-parser';
import { FailedResponse } from '#ai/ui/messages/failed-response';
import { SubmittedFormResponse } from '#ai/ui/messages/submitted-form-response';
import { AssistantActivity } from '#ai/ui/tool-calls/assistant-activity';
import type { Reply } from './types';

function uiMessageFailure(message: UIMessage): unknown {
  const extra = message as UIMessage & { error?: unknown };
  if (extra.error != null) return extra.error;
  for (const part of message.parts) {
    if ('errorText' in part && typeof part.errorText === 'string' && part.errorText.trim()) {
      return part.errorText;
    }
  }
  return undefined;
}

export function MessageBubble({
  disabled,
  displayedText,
  formSubmitted,
  formValues,
  generatedForm,
  isUser,
  message,
  onReply,
  onResend,
  resendDisabled,
  submittedResponse
}: {
  disabled: boolean;
  displayedText: string;
  formSubmitted: boolean;
  formValues?: Record<string, unknown>;
  generatedForm: ParsedAssistantForm | null;
  isUser: boolean;
  message: UIMessage;
  onReply?: Reply;
  onResend?: () => Promise<boolean>;
  resendDisabled?: boolean;
  submittedResponse: Array<[string, string]> | null;
}) {
  const showWriting =
    !displayedText && !generatedForm?.hasFormSource && message.status === 'streaming';
  const content = (
    <>
      {submittedResponse ? (
        <SubmittedFormResponse entries={submittedResponse} />
      ) : displayedText ? (
        isUser ? (
          <Markdown className="whitespace-normal">{displayedText}</Markdown>
        ) : (
          <Markdown className="whitespace-normal" streaming={message.status === 'streaming'}>
            {displayedText}
          </Markdown>
        )
      ) : null}
      {!isUser && generatedForm?.hasFormSource && onReply && (
        <AssistantGeneratedForm
          disabled={disabled}
          isStreaming={message.status === 'streaming'}
          onReply={onReply}
          spec={generatedForm.spec}
          submittedValues={formValues}
          submitted={formSubmitted}
        />
      )}
      {showWriting && <AssistantActivity compact mode="writing" />}
      {message.status === 'failed' && (
        <FailedResponse
          disabled={resendDisabled ?? disabled}
          error={uiMessageFailure(message)}
          onResend={onResend}
        />
      )}
    </>
  );
  // Travelers' replies sit in the coss outgoing bubble; assistant prose reads as an open column.
  return isUser ? (
    <ChatMessageBubble className="max-w-full leading-6 text-pretty" side="outgoing">
      {content}
    </ChatMessageBubble>
  ) : (
    <div className="flex min-w-0 flex-col gap-2 leading-6 text-pretty" data-slot="assistant-reply">
      {content}
    </div>
  );
}
