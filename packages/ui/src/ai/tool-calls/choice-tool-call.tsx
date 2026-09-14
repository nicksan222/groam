import { AssistantChoiceReceipt } from '#tsx/ai/tool-calls/assistant-choice-receipt';
import type { ToolCallComponentProps } from './assistant-tool-call-types';

export function ChoiceToolCall({
  disabled,
  onReply,
  presentation,
  selectedChoices
}: ToolCallComponentProps) {
  if (presentation.kind !== 'choice') return null;
  return (
    <AssistantChoiceReceipt
      choice={presentation}
      disabled={disabled}
      onChoose={
        onReply
          ? async (option) => await onReply(`${presentation.question}\nMy choice: ${option}`)
          : undefined
      }
      selectedChoice={selectedChoices?.[presentation.question]}
    />
  );
}
