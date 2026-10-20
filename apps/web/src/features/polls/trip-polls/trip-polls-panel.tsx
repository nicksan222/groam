import { Plus, Vote } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Skeleton } from '@groam/ui/components/skeleton';
import { useState } from 'react';
import { CreatePollDialog } from '@/features/polls/create-poll/create-poll-dialog';
import { usePollActions, useTripPolls } from '@/features/polls/hooks/use-polls';
import { PollCard } from '@/features/polls/poll-card/poll-card';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { testIds } from '@/lib/test-ids';

/** The trip's Polls tab: open and closed polls, newest first. */
export function TripPollsPanel({ trip }: { trip: TripDetail }) {
  const { canLoadMore, isLoading, loadMore, polls } = useTripPolls(trip.id);
  const actions = usePollActions();
  const [creating, setCreating] = useState(false);
  const writable = trip.archivedAt === null;
  const openCount = polls.filter((poll) => poll.status === 'open').length;
  const createButton = writable ? (
    <Button data-testid={testIds.tripPollsCreate} onClick={() => setCreating(true)} size="sm">
      <Plus />
      New poll
    </Button>
  ) : null;
  return (
    <TripSectionPanel
      badge={isLoading ? undefined : `${openCount} open`}
      description="Questions the group decides together by vote."
      icon={Vote}
      testId={testIds.tripPollsPanel}
      title="Polls"
      trailing={polls.length > 0 ? createButton : null}
    >
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
    </TripSectionPanel>
  );
}
