import { MessagePresentation } from './message-presentation';
import type { MessageKindProps } from './types';

/** Rendering strategy for durable system and context messages. */
export function SystemMessage(props: MessageKindProps) {
  return <MessagePresentation {...props} />;
}
