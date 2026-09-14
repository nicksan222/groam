import { ChatComposer } from '@groam/ui/components/chat-composer';
import {
  AssistantAttachmentChips,
  AssistantAttachmentPicker,
  type AssistantAttachments
} from '#tsx/ai/attachments/assistant-attachments';

export function AssistantComposer({
  attachments,
  contextAvailable,
  disabled,
  focusOnMount = false,
  isSending,
  isStopping = false,
  onStop,
  onSubmit
}: {
  attachments?: AssistantAttachments;
  contextAvailable: boolean;
  disabled: boolean;
  focusOnMount?: boolean;
  isSending: boolean;
  isStopping?: boolean;
  onStop?: () => Promise<boolean>;
  onSubmit: (prompt: string) => Promise<boolean>;
}) {
  return (
    <ChatComposer
      beforeInput={attachments ? <AssistantAttachmentChips attachments={attachments} /> : undefined}
      disabled={disabled}
      focusOnMount={focusOnMount}
      isResponding={isSending}
      isStopping={isStopping}
      label="Assistant prompt"
      maxLength={800}
      notice="AI can make mistakes."
      onStop={onStop}
      onSubmit={onSubmit}
      placeholder={composerPlaceholder(contextAvailable, isSending)}
      submitLabel="Submit prompt"
      toolbarStart={
        attachments ? <AssistantAttachmentPicker attachments={attachments} /> : undefined
      }
    />
  );
}

function composerPlaceholder(contextAvailable: boolean, isSending: boolean): string {
  if (!contextAvailable) return 'No context for this screen';
  return isSending ? 'Groam is responding…' : 'Message Groam…';
}
