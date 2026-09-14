import { GitPullRequest, Lightbulb } from 'lucide-react';
import { IdeaWorkspaceLink } from '@/features/ideas/idea-list/idea-workspace-link';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { splitTripProposals } from '@/features/trips/trip-list/trip-list-order';
import { Link } from '@/features/workspace/navigation/router';

export function TripIdeasPane({
  isLoading,
  items,
  trip
}: {
  isLoading: boolean;
  items: WorkspaceTripProposal[];
  trip?: TripListItem;
}) {
  const { openIdeas, settled, waitingOnYou } = splitTripProposals(items);
  const applied = settled.filter((proposal) => proposal.status === 'merged').length;
  const featured = waitingOnYou[0] ?? openIdeas[0];
  return (
    <div className="mx-5 grid h-24 min-w-0 grid-rows-[1rem_2rem] gap-3 border-t border-border/50 py-3">
      <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p className="flex min-w-0 items-center gap-1.5">
          <Lightbulb aria-hidden="true" className="size-3" />
          <span className="sr-only">Ideas: </span>
          {isLoading ? (
            'Loading ideas…'
          ) : (
            <>
              <span className="shrink-0">{openIdeas.length} open</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{applied} applied</span>
            </>
          )}
        </p>
        {trip && (
          <Link
            className="shrink-0 rounded-sm hover:text-foreground focus-visible:outline-ring"
            params={{ section: 'ideas', tripId: trip.id }}
            to="/trips/$tripId/$section"
          >
            View ideas
          </Link>
        )}
      </div>
      {featured ? (
        <IdeaWorkspaceLink
          className="flex min-w-0 items-center gap-2 rounded-md text-xs text-foreground/80 hover:text-foreground focus-visible:outline-ring"
          proposal={featured}
        >
          <GitPullRequest aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{featured.title}</span>
          <span className="ml-auto shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {featured.reviewRequested ? 'Your review' : ideaStatusLabel(featured.status)}
          </span>
        </IdeaWorkspaceLink>
      ) : (
        <p className="flex items-center text-xs text-muted-foreground">
          {isLoading ? 'Gathering the latest updates' : 'A little room for your next idea.'}
        </p>
      )}
    </div>
  );
}
