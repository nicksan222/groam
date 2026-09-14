import type { UIMessage } from '@convex-dev/agent/react';
import { parseAssistantContextMessage } from '@groam/ai-contracts/agents/registry';
import { Button } from '@groam/ui/components/button';
import {
  ConversationTimeline,
  type ConversationTimelineItem
} from '@groam/ui/components/conversation-timeline';
import { Message, MessageContent } from '@groam/ui/components/message';
import { MessageScrollerItem } from '@groam/ui/components/message-scroller';
import { parseAssistantGeneratedForm } from '#src/ai/form/assistant-generated-form-parser';
import { AssistantChatMessage } from '#tsx/ai/chat/assistant-chat-message';
import type { AgentScreenContext } from '#tsx/ai/context/agent-context';
import { AssistantActivity } from '#tsx/ai/tool-calls/assistant-activity';
import { suggestedPrompts } from './suggested-prompts';

export function AssistantConversation({
  context,
  isOpening,
  isSending,
  loadMore,
  messages,
  onReply,
  onResend,
  status
}: {
  context: AgentScreenContext | null;
  isOpening: boolean;
  isSending: boolean;
  loadMore: (count: number) => void;
  messages: UIMessage[];
  onReply?: (prompt: string) => Promise<boolean>;
  onResend?: (message: UIMessage) => Promise<boolean>;
  status: string;
}) {
  const hasStreamingMessage = messages.some((message) => message.status === 'streaming');
  const isThinking = isOpening || (isSending && !hasStreamingMessage);
  const visibleMessages = messagesWithContextChanges(messages);
  const submittedForms = submittedFormsByAssistantMessage(visibleMessages);
  const submittedChoices = submittedChoicesByAssistantMessage(visibleMessages);
  const responseMessageKeys = new Set([
    ...[...submittedForms.values()].map((submission) => submission.responseMessageKey),
    ...[...submittedChoices.values()].map((submission) => submission.responseMessageKey)
  ]);
  const displayedMessages = visibleMessages.filter(
    (message) => !responseMessageKeys.has(message.key)
  );
  const resendTargets = resendTargetsByMessage(displayedMessages);

  const items: ConversationTimelineItem[] = displayedMessages.map((message, index) => {
    const submission = submittedForms.get(message.key);
    const choiceSubmission = submittedChoices.get(message.key);
    return {
      content: (
        <AssistantChatMessage
          choiceResponses={choiceSubmission?.answers}
          disabled={isSending || index !== displayedMessages.length - 1}
          formSubmitted={submission !== undefined}
          formValues={submission?.values}
          message={message}
          onReply={onReply}
          resendDisabled={isSending}
          onResend={
            onResend && resendTargets.get(message.key)
              ? async () => await onResend(resendTargets.get(message.key) as UIMessage)
              : undefined
          }
        />
      ),
      key: message.key
    };
  });

  return (
    <ConversationTimeline
      empty={<AssistantWelcome context={context} disabled={isSending} onReply={onReply} />}
      isLoading={status === 'LoadingFirstPage'}
      items={items}
      loadMore={loadMore}
      pending={
        isThinking ? (
          <Message>
            <MessageContent className="max-w-[92%]">
              <AssistantActivity mode={isOpening ? 'connecting' : 'thinking'} />
            </MessageContent>
          </Message>
        ) : undefined
      }
      status={status}
    />
  );
}

function AssistantWelcome({
  context,
  disabled,
  onReply
}: {
  context: AgentScreenContext | null;
  disabled: boolean;
  onReply?: (prompt: string) => Promise<boolean>;
}) {
  const suggestions = context ? suggestedPrompts(context) : [];
  return (
    <MessageScrollerItem className="my-auto">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-10">
        <h2 className="text-base font-medium tracking-tight">
          {context ? 'How can I help?' : 'No screen context registered'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {context
            ? context.description
            : 'This page has not registered the data and actions its agents may use.'}
        </p>
        {context && onReply && (
          <div className="mt-8 flex flex-col items-start gap-1">
            {suggestions.map((suggestion) => (
              <Button
                className="h-auto px-0 py-1.5 text-left text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                disabled={disabled}
                key={suggestion.prompt}
                onClick={() => void onReply(suggestion.prompt)}
                size="sm"
                variant="ghost"
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </MessageScrollerItem>
  );
}

function submittedFormsByAssistantMessage(messages: UIMessage[]) {
  const submitted = new Map<
    string,
    { responseMessageKey: string; values: Record<string, unknown> }
  >();
  let pendingFormKey: string | null = null;
  for (const message of messages) {
    if (message.role === 'assistant') {
      pendingFormKey = parseAssistantGeneratedForm(message.text).hasFormSource ? message.key : null;
      continue;
    }
    if (message.role !== 'user' || !pendingFormKey) continue;
    const values = submittedFormValues(message.text);
    if (!values) continue;
    submitted.set(pendingFormKey, { responseMessageKey: message.key, values });
    pendingFormKey = null;
  }
  return submitted;
}

function submittedChoicesByAssistantMessage(messages: UIMessage[]) {
  const submitted = new Map<
    string,
    { answers: Record<string, string>; responseMessageKey: string }
  >();
  let pending: { key: string; questions: Set<string> } | null = null;
  for (const message of messages) {
    if (message.role === 'assistant') {
      const questions = choiceQuestions(message);
      pending = questions.size > 0 ? { key: message.key, questions } : null;
      continue;
    }
    if (message.role !== 'user' || !pending) continue;
    const choice = submittedChoice(message.text);
    if (!choice || !pending.questions.has(choice.question)) continue;
    const existing = submitted.get(pending.key);
    submitted.set(pending.key, {
      answers: { ...existing?.answers, [choice.question]: choice.answer },
      responseMessageKey: message.key
    });
  }
  return submitted;
}

function choiceQuestions(message: UIMessage): Set<string> {
  return new Set(
    message.parts.flatMap((part) => {
      if (part.type !== 'tool-askUserChoice' || !('input' in part)) return [];
      const input = part.input;
      if (typeof input !== 'object' || input === null || Array.isArray(input)) return [];
      const question = (input as Record<string, unknown>).question;
      return typeof question === 'string' ? [question] : [];
    })
  );
}

function submittedChoice(text: string): { answer: string; question: string } | null {
  const separator = '\nMy choice: ';
  const separatorIndex = text.lastIndexOf(separator);
  if (separatorIndex <= 0) return null;
  const question = text.slice(0, separatorIndex).trim();
  const answer = text.slice(separatorIndex + separator.length).trim();
  return question && answer ? { answer, question } : null;
}

function submittedFormValues(text: string): Record<string, unknown> | null {
  const prefix = 'Here are my form responses:\n';
  if (!text.startsWith(prefix)) return null;
  try {
    const values: unknown = JSON.parse(text.slice(prefix.length));
    return typeof values === 'object' && values !== null && !Array.isArray(values)
      ? (values as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function resendTargetsByMessage(messages: UIMessage[]): Map<string, UIMessage> {
  const targets = new Map<string, UIMessage>();
  let latestUserMessage: UIMessage | null = null;
  for (const message of messages) {
    if (message.role === 'user') {
      latestUserMessage = message;
      targets.set(message.key, message);
      continue;
    }
    if (message.role === 'assistant' && message.status === 'failed' && latestUserMessage) {
      targets.set(message.key, latestUserMessage);
    }
  }
  return targets;
}

function messagesWithContextChanges(messages: UIMessage[]): UIMessage[] {
  let previousContext = '';
  return messages.filter((message) => {
    if (message.role !== 'system') return true;
    const context = parseAssistantContextMessage(message.text);
    if (!context) return false;
    const serialized = JSON.stringify(context);
    if (serialized === previousContext) return false;
    previousContext = serialized;
    return true;
  });
}
