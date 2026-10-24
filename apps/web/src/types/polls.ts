import type { api } from '@groam/backend/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

export type Poll = FunctionReturnType<typeof api.routes.polls.get.run>;
export type CreatePollInput = FunctionArgs<typeof api.routes.polls.create.run>;
/** What the create dialog collects; the caller adds the trip or chat. */
export type CreatePollDraft = Pick<CreatePollInput, 'multiSelect' | 'options' | 'question'>;
