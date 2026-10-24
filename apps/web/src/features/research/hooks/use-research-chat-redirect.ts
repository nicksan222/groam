import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

/**
 * Where a chat id really lives. A research has one canonical page under its trip; every other chat,
 * trip chats included, stays under `/chat`.
 */
export function useResearchChatRedirect(discussionId: string) {
  const resolved = useQuery(api.routes.references.resolve.run, {
    reference: discussionId,
    table: 'discussions'
  });
  if (!resolved || !('kind' in resolved) || !resolved.tripId || resolved.kind !== 'research') {
    return null;
  }
  return { kind: 'research' as const, researchId: resolved.shortId, tripId: resolved.tripId };
}
