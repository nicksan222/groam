import { ChatComposer } from '@groam/ui/components/chat-composer';
import {
  AssistantAttachmentChips,
  AssistantAttachmentPicker,
  type AssistantAttachments
} from '#ai/ui/attachments/assistant-attachments';

export function AssistantComposer({
  attachments,
  contextAvailable,
  disabled,
  focusOnMount = false,
  isSending,
  isStopping = false,
  message,
  onMessageChange,
  onStop,
  onSubmit
}: {
  attachments?: AssistantAttachments;
  contextAvailable: boolean;
  disabled: boolean;
  focusOnMount?: boolean;
  isSending: boolean;
  isStopping?: boolean;
  message?: string;
  onMessageChange?: (message: string) => void;
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
      message={message}
      notice="AI can make mistakes."
      onMessageChange={onMessageChange}
      onStop={onStop}
      onSubmit={onSubmit}
      placeholder={composerPlaceholder(contextAvailable, isSending)}
      submitLabel="Submit prompt"
      variant="sidechat"
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
