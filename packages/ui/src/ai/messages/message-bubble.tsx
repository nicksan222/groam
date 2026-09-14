import type { UIMessage } from '@convex-dev/agent/react';
import { Bubble, BubbleContent } from '@groam/ui/components/bubble';
import type { ParsedAssistantForm } from '#src/ai/form/assistant-generated-form-parser';
import { AssistantGeneratedForm } from '#tsx/ai/form/assistant-generated-form';
import { FailedResponse } from '#tsx/ai/messages/failed-response';
import { SubmittedFormResponse } from '#tsx/ai/messages/submitted-form-response';
import { AssistantActivity } from '#tsx/ai/tool-calls/assistant-activity';
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
  return (
    <Bubble
      className={
        isUser
          ? 'max-w-full *:data-[slot=bubble-content]:border-primary-foreground/10 *:data-[slot=bubble-content]:shadow-sm'
          : 'max-w-full'
      }
      variant={isUser ? 'default' : 'ghost'}
    >
      <BubbleContent className="whitespace-pre-wrap leading-6 text-pretty">
        {submittedResponse ? <SubmittedFormResponse entries={submittedResponse} /> : displayedText}
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
      </BubbleContent>
    </Bubble>
  );
}
