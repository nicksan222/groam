import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { SendMessageAction } from '#src/actions/send-message';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const sendMessage: SendMessageAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.discussionId) throw new Error('The backend sendMessage action requires discussionId');
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: `app-action:${crypto.randomUUID()}`,
    discussionId: input.discussionId as Id<'discussions'>,
    text: input.text
  });
};
