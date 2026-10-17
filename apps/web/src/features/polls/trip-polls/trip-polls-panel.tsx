import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Vote } from 'lucide-react';
import { useState } from 'react';
import { CreatePollDialog } from '@/features/polls/create-poll/create-poll-dialog';
import { usePollActions, useTripPolls } from '@/features/polls/hooks/use-polls';
import { PollCard } from '@/features/polls/poll-card/poll-card';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';

/** The trip's Polls tab: open and closed polls, newest first. */
export function TripPollsPanel({ trip }: { trip: TripDetail }) {
  const { canLoadMore, isLoading, loadMore, polls } = useTripPolls(trip.id);
  const actions = usePollActions();
  const [creating, setCreating] = useState(false);
  const writable = trip.archivedAt === null;
  const createButton = writable ? (
    <Button data-testid={testIds.tripPollsCreate} onClick={() => setCreating(true)} size="sm">
      New poll
    </Button>
  ) : null;
  return (
    <section
      aria-label="Polls"
      className="flex flex-col gap-3"
      data-testid={testIds.tripPollsPanel}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Polls</h2>
        {polls.length > 0 ? createButton : null}
      </div>
      {isLoading ? (
        <div aria-label="Loading polls…" className="flex flex-col gap-2" role="status">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : polls.length === 0 ? (
        <EmptyScreen
          buttonRaw={createButton}
          description="Ask the group to decide something together."
          headline="No polls yet"
          icon={Vote}
        />
      ) : (
        polls.map((poll) => (
          <PollCard
            key={poll.id}
            onClose={() => actions.close(poll.id)}
            onRetract={() => actions.retract(poll.id)}
            onVote={(optionIds) => actions.vote(poll.id, optionIds)}
            poll={poll}
          />
        ))
      )}
      {canLoadMore ? (
        <Button className="self-center" onClick={loadMore} size="sm" variant="ghost">
          Show older polls
        </Button>
      ) : null}
      <CreatePollDialog
        onClose={() => setCreating(false)}
        onCreate={(draft) => actions.create({ ...draft, tripId: trip.id })}
        open={creating}
      />
    </section>
  );
}
