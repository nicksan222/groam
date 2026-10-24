import { api } from '@groam/backend/api';
import { OPEN_POLLS_FIRST_PAGE as OPEN_PAGE } from '@groam/backend/convex/modules/polls/limits';
import type { Id } from '@groam/backend/data-model';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';
import { attempt, attemptValue } from '@/lib/errors';
import type { CreatePollInput, Poll } from '@/types/polls';

const none: Poll[] = [];
const CLOSED_PAGE = 10;

/** A trip's open polls, then its closed ones; both page in as the list grows. */
export function useTripPolls(tripId: Id<'trips'> | undefined) {
  const open = usePaginatedQuery(
    api.routes.polls.list.trip.run,
    tripId ? { status: 'open', tripId } : 'skip',
    { initialNumItems: OPEN_PAGE }
  );
  const closed = usePaginatedQuery(
    api.routes.polls.list.trip.run,
    tripId ? { status: 'closed', tripId } : 'skip',
    { initialNumItems: CLOSED_PAGE }
  );
  const polls = useMemo(
    () =>
      open.results.length + closed.results.length === 0
        ? none
        : [...open.results, ...closed.results],
    [closed.results, open.results]
  );
  const canLoadMore = open.status === 'CanLoadMore' || closed.status === 'CanLoadMore';
  const loadMore = useCallback(() => {
    if (open.status === 'CanLoadMore') open.loadMore(OPEN_PAGE);
    else if (closed.status === 'CanLoadMore') closed.loadMore(CLOSED_PAGE);
  }, [closed, open]);
  return {
    canLoadMore,
    isLoading:
      tripId !== undefined &&
      (open.status === 'LoadingFirstPage' || closed.status === 'LoadingFirstPage'),
    loadMore,
    polls
  };
}

/**
 * A trip's first page of open polls, for counts and summaries. The Polls section pages through
 * every poll with `useTripPolls`.
 */
export function useTripOpenPolls(tripId: Id<'trips'> | undefined) {
  const open = usePaginatedQuery(
    api.routes.polls.list.trip.run,
    tripId ? { status: 'open', tripId } : 'skip',
    { initialNumItems: OPEN_PAGE }
  );
  return {
    isLoading: tripId !== undefined && open.status === 'LoadingFirstPage',
    polls: open.results.length === 0 ? none : open.results
  };
}

/** The polls shown inside one chat. */
export function useDiscussionPolls(discussionId: Id<'discussions'>) {
  return { polls: useQuery(api.routes.polls.list.discussion.run, { discussionId }) ?? none };
}

/** Poll writes; each toasts its own failure and resolves to whether it worked. */
export function usePollActions() {
  const createMutation = useMutation(api.routes.polls.create.run);
  const voteMutation = useMutation(api.routes.polls.vote.run);
  const retractMutation = useMutation(api.routes.polls.retract.run);
  const closeMutation = useMutation(api.routes.polls.close.run);
  const removeMutation = useMutation(api.routes.polls.remove.run);
  const create = useCallback(
    (input: CreatePollInput) =>
      attemptValue(() => createMutation(input), 'Unable to create the poll'),
    [createMutation]
  );
  const vote = useCallback(
    (pollId: Id<'polls'>, optionIds: string[]) =>
      attempt(() => voteMutation({ optionIds, pollId }), 'Unable to vote'),
    [voteMutation]
  );
  const retract = useCallback(
    (pollId: Id<'polls'>) =>
      attempt(() => retractMutation({ pollId }), 'Unable to remove your vote'),
    [retractMutation]
  );
  const close = useCallback(
    (pollId: Id<'polls'>) => attempt(() => closeMutation({ pollId }), 'Unable to close the poll'),
    [closeMutation]
  );
  const remove = useCallback(
    (pollId: Id<'polls'>) => attempt(() => removeMutation({ pollId }), 'Unable to delete the poll'),
    [removeMutation]
  );
  return useMemo(
    () => ({ close, create, remove, retract, vote }),
    [close, create, remove, retract, vote]
  );
}
