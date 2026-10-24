import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type ChatGptConnection = FunctionReturnType<
  typeof api.routes.settings.ai.get.run
>['connections'][number];
export type ChatGptConnectionId = ChatGptConnection['id'];
export type ChatGptModel = FunctionReturnType<typeof api.routes.settings.ai.models.run>[number];
