import { agentRunTime } from '@groam/ai/backend/runs/time';
import { ArrowRight } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { useDashboardPolls } from '@/features/dashboard/hooks/use-dashboard-polls';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { DashboardPoll } from '@/types/dashboard';
import { DashboardSectionHeading } from './dashboard-section-heading';

const rowClass =
  'group flex min-w-0 items-center justify-between gap-3 border-b border-border p-3 last:border-b-0';

function PollRowBody({ poll }: { poll: DashboardPoll }) {
  const meta = [
    poll.tripName ?? (poll.discussionId ? 'Chat' : 'Group'),
    poll.closesAt ? `closes ${agentRunTime(poll.closesAt)}` : null,
    `${poll.votedCount} voted`
  ].filter(Boolean);
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-muted-foreground">{meta.join(' · ')}</span>
        <span className="mt-1 block truncate text-sm font-semibold text-foreground">
          {poll.question}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-primary">
        Vote
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
    </>
  );
}

function PollRow({ poll }: { poll: DashboardPoll }) {
  const testId = testIds.dashboardOpenPollsRow;
  if (poll.tripId) {
    return (
      <Link
        className={`${rowClass} hover:bg-muted/60`}
        data-testid={testId}
        params={{ section: 'polls', tripId: poll.tripId }}
        to="/trips/$tripId/$section"
      >
        <PollRowBody poll={poll} />
      </Link>
    );
  }
  if (poll.discussionId) {
    return (
      <Link
        className={`${rowClass} hover:bg-muted/60`}
        data-testid={testId}
        params={{ discussionId: poll.discussionId }}
        to="/chat/$discussionId"
      >
        <PollRowBody poll={poll} />
      </Link>
    );
  }
  // Group-level polls have no page of their own yet, so the row is not a link.
  return (
    <div className={rowClass} data-testid={testId}>
      <PollRowBody poll={poll} />
    </div>
  );
}

/** Zone A: open polls the viewer has not answered. */
export function OpenPollsSection() {
  const { canLoadMore, isLoadingMore, loadMore, isLoading, polls } = useDashboardPolls();
  if (isLoading || (polls.length === 0 && !canLoadMore && !isLoadingMore)) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-open-polls-heading"
      data-testid={testIds.dashboardOpenPolls}
      stack="sm"
    >
      <DashboardSectionHeading
        description="Polls the group is waiting for your vote on."
        id="dashboard-open-polls-heading"
        title="Polls to vote on"
      />
      {polls.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {polls.map((poll) => (
            <PollRow key={poll.id} poll={poll} />
          ))}
        </div>
      ) : null}
      {canLoadMore || isLoadingMore ? (
        <Button disabled={isLoadingMore} onClick={loadMore} size="sm" variant="outline">
          {isLoadingMore ? 'Loading polls…' : 'Load more polls'}
        </Button>
      ) : null}
    </Shell.Section>
  );
}
