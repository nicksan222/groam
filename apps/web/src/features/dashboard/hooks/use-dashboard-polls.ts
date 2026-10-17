import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

const POLL_LIMIT = 4;

/** Open polls the viewer has not voted in yet: a to-do for "Needs you". */
export function useDashboardPolls() {
  const open = useQuery(api.routes.polls.list.open.run, {});
  return useMemo(
    () => ({
      isLoading: open === undefined,
      polls: (open ?? []).filter((poll) => !poll.viewerHasVoted).slice(0, POLL_LIMIT)
    }),
    [open]
  );
}
