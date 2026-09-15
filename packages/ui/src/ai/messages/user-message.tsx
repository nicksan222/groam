import { Button } from '@groam/ui/components/button';
import { ChatMessage } from '@groam/ui/components/chat-message';
import { RotateCcw } from 'lucide-react';
import { MessagePresentation } from './message-presentation';
import type { MessageKindProps } from './types';

/** Adapts an AI-chat traveler message to shared UI, except AI form receipts. */
export function UserMessage(props: MessageKindProps) {
  if (props.message.text.startsWith('Here are my form responses:\n')) {
    return <MessagePresentation {...props} />;
  }
  return (
    <div>
      <ChatMessage mine status={props.message.status} text={props.message.text} variant="private" />
      {props.onResend && (
        <div className="mt-1 flex justify-end">
          <Button
            aria-label="Resend message"
            className="h-6 rounded-md px-1.5 text-[10px] text-muted-foreground"
            disabled={props.resendDisabled ?? props.disabled}
            onClick={() => void props.onResend?.()}
            size="xs"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3" /> Resend
          </Button>
        </div>
      )}
    </div>
  );
}
