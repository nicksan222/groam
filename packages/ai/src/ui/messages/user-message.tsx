import { RotateCcw } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { ChatTextMessage, type ChatTextMessageProps } from '@groam/ui/components/chat-text-message';
import { MessagePresentation } from './message-presentation';
import { SUBMITTED_FORM_RESPONSE_PREFIX } from './parse-submitted-form-response';
import type { MessageKindProps } from './types';

/** Adapts an AI-chat traveler message to shared UI, except AI form receipts. */
export function UserMessage(props: MessageKindProps) {
  if (props.message.text.startsWith(SUBMITTED_FORM_RESPONSE_PREFIX)) {
    return <MessagePresentation {...props} />;
  }
  return (
    <div>
      <ChatTextMessage
        side="outgoing"
        status={deliveryStatus(props.message.status)}
        text={props.message.text}
      />
      {props.onResend && (
        <div className="mt-1 flex justify-end">
          <Button
            aria-label="Resend message"
            className="h-6 rounded-md px-2 text-[10px] text-muted-foreground"
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

function deliveryStatus(status: string): ChatTextMessageProps['status'] {
  if (status === 'pending') return 'pending';
  return status === 'failed' ? 'failed' : 'sent';
}
