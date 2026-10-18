import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

/** Where a chat id really lives: the trip research page when the id names a research. */
export function useResearchChatRedirect(discussionId: string) {
  const resolved = useQuery(api.routes.references.resolve.run, {
    reference: discussionId,
    table: 'discussions'
  });
  if (resolved && 'kind' in resolved && resolved.kind === 'research' && resolved.tripId) {
    return { researchId: resolved.shortId, tripId: resolved.tripId };
  }
  return null;
}
