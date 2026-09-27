import type { UIMessage } from '@convex-dev/agent/react';
import type { ReactNode } from 'react';

export type Reply = (prompt: string) => Promise<boolean>;

export type MessageKindProps = {
  choiceResponses?: Record<string, string>;
  disabled: boolean;
  formSubmitted?: boolean;
  formValues?: Record<string, unknown>;
  message: UIMessage;
  onReply?: Reply;
  onResend?: () => Promise<boolean>;
  resendDisabled?: boolean;
};

export type MessageKindStrategy = (props: MessageKindProps) => ReactNode;
