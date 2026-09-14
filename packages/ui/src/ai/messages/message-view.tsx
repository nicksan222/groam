import { type UIMessage, useSmoothText } from '@convex-dev/agent/react';
import { parseAssistantContextMessage } from '@groam/ai-contracts/agents/registry';
import { Message, MessageContent } from '@groam/ui/components/message';
import { parseAssistantGeneratedForm } from '#src/ai/form/assistant-generated-form-parser';
import { AssistantContextMarker } from './assistant-context-marker';
import { assistantSources } from './assistant-source';
import { MessageBubble } from './message-bubble';
import { MessageExtras } from './message-extras';
import { parseSubmittedFormResponse } from './parse-submitted-form-response';
import type { Reply } from './types';

function presentationState(message: UIMessage, visibleText: string, isSmoothStreaming: boolean) {
  const isUser = message.role === 'user';
  const generatedForm = isUser ? null : parseAssistantGeneratedForm(visibleText);
  const submittedResponse = isUser ? parseSubmittedFormResponse(visibleText) : null;
  return {
    displayedText: submittedResponse ? '' : (generatedForm?.prose ?? visibleText),
    generatedForm,
    hasChoice: !isUser && message.parts.some((part) => part.type === 'tool-askUserChoice'),
    isUser,
    sources: isUser ? [] : assistantSources(message.parts),
    submittedResponse,
    suppressChoices:
      (generatedForm?.hasFormSource ?? false) || message.status === 'streaming' || isSmoothStreaming
  };
}

export function MessagePresentation({
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
  const [visibleText, smoothText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming'
  });
  const recordedContext =
    message.role === 'system' ? parseAssistantContextMessage(message.text) : null;
  if (recordedContext) return <AssistantContextMarker context={recordedContext} />;

  const {
    displayedText,
    generatedForm,
    hasChoice,
    isUser,
    sources,
    submittedResponse,
    suppressChoices
  } = presentationState(message, visibleText, smoothText?.isStreaming ?? false);

  return (
    <Message align={isUser ? 'end' : 'start'}>
      <MessageContent
        className={isUser ? 'max-w-[84%]' : hasChoice ? 'w-full max-w-full' : 'max-w-[92%]'}
      >
        <MessageBubble
          disabled={disabled}
          displayedText={displayedText}
          formSubmitted={formSubmitted}
          formValues={formValues}
          generatedForm={generatedForm}
          isUser={isUser}
          message={message}
          onReply={onReply}
          onResend={onResend}
          resendDisabled={resendDisabled}
          submittedResponse={submittedResponse}
        />
        <MessageExtras
          choiceResponses={choiceResponses}
          disabled={disabled}
          displayedText={displayedText}
          isUser={isUser}
          message={message}
          onReply={onReply}
          sources={sources}
          suppressChoices={suppressChoices}
        />
      </MessageContent>
    </Message>
  );
}
