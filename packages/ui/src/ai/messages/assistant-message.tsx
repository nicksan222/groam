import { MessagePresentation } from './message-presentation';
import type { MessageKindProps } from './types';

/** Rendering strategy for AI-authored messages and generated interactions. */
export function AssistantResponseMessage(props: MessageKindProps) {
  return <MessagePresentation {...props} />;
}
