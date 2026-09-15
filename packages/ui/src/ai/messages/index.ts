import { AssistantResponseMessage } from './assistant-message';
import { SystemMessage } from './system-message';
import type { MessageKindStrategy } from './types';
import { UserMessage } from './user-message';

/** Message rendering strategies keyed by the persisted message role. */
export const assistantMessageStrategies = {
  assistant: AssistantResponseMessage,
  system: SystemMessage,
  user: UserMessage
} satisfies Record<'assistant' | 'system' | 'user', MessageKindStrategy>;

export type AssistantMessageKind = keyof typeof assistantMessageStrategies;
