import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { attempt } from '@/lib/errors';

/** Notes are group contributions; saving one never invokes an assistant. */
export function useSaveResearchNote(discussionId: Id<'discussions'>) {
  const send = useMutation(api.routes.discussions.messages.send.run);
  return useCallback(
    ({ text }: { text: string }) =>
      attempt(
        () =>
          send({
            clientRequestId: crypto.randomUUID(),
            discussionId,
            text
          }),
        'Unable to save this research note'
      ),
    [discussionId, send]
  );
}
