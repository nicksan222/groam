import { CoverFrame } from '@groam/ui/components/cover-frame';
import { Skeleton } from '@groam/ui/components/skeleton';
import { ArrowRight, CalendarDays, Compass, MapPin } from 'lucide-react';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { latestTripActivityAt, relativeTripDate } from '@/features/trips/trip-list/trip-list-order';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { TripIdeasPane } from './trip-ideas-pane';

const thumbnailClassName =
  'h-20 w-24 shrink-0 rounded-xl border border-border/40 bg-muted/40 [&_img]:transition-none [&_img]:group-hover:scale-100';
const cardClassName =
  'group min-w-0 rounded-2xl border border-border/60 bg-card transition-colors hover:border-border focus-within:border-ring';

export function TripWorkspaceSection({
  isLoading = false,
  isLoadingProposals,
  proposals,
  trip
}: {
  isLoading?: boolean;
  isLoadingProposals: boolean;
  proposals: WorkspaceTripProposal[];
  trip?: TripListItem;
}) {
  if (isLoading || !trip) {
    return (
      <article className={cardClassName}>
        <div className="space-y-5 p-5 pb-4">
          <div className="flex h-20 items-center gap-4">
            <Skeleton className="h-20 w-24 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>
          <div className="grid h-16 grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Where</span>
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">When</span>
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
        <TripIdeasPane isLoading items={[]} />
      </article>
    );
  }
  const archived = trip.archivedAt !== null;
  const destination = trip.destination ?? 'Not decided yet';
  const dates = trip.dateNotes ?? 'Flexible dates';
  const nextAction = !archived && trip.outstandingActionCount > 0 ? trip.nextAction : null;

  return (
    <article aria-labelledby={`trip-${trip.id}-title`} className={cardClassName}>
      <Link
        aria-label={trip.name}
        className="block rounded-t-2xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-archived={archived || undefined}
        data-testid={testIds.tripCard}
        data-trip-id={trip.id}
        data-trip-name={trip.name}
        params={{ section: 'overview', tripId: trip.id }}
        to="/trips/$tripId/$section"
      >
        <div className="space-y-5 p-5 pb-4">
          <div className="flex h-20 min-w-0 items-center gap-4">
            <CoverFrame
              alt=""
              className={thumbnailClassName}
              src={trip.coverUrl}
              fallback={
                <Compass
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                  strokeWidth={1.5}
                />
              }
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-[11px] leading-4 text-muted-foreground">
                {archived
                  ? 'Archived'
                  : `Updated ${relativeTripDate(latestTripActivityAt(trip, proposals))}`}
              </p>
              <h2
                id={`trip-${trip.id}-title`}
                title={trip.name}
                className="line-clamp-2 break-words text-base font-semibold leading-5 tracking-tight text-foreground"
              >
                {trip.name}
              </h2>
            </div>
          </div>
          <dl className="grid h-16 min-w-0 grid-cols-2 gap-4">
            <div className="min-w-0">
              <dt className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3" />
                Destination
              </dt>
              <dd
                className="line-clamp-2 break-words text-sm leading-5 text-foreground/85"
                title={destination}
              >
                {destination}
              </dd>
            </div>
            <div className="min-w-0 border-l border-border/50 pl-4">
              <dt className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-3" />
                Dates
              </dt>
              <dd
                className="line-clamp-2 break-words text-sm leading-5 text-foreground/85"
                title={dates}
              >
                {dates}
              </dd>
            </div>
          </dl>
          <div className="flex h-14 min-w-0 items-center gap-3 rounded-lg bg-muted/40 px-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium leading-4 text-muted-foreground">
                {nextAction ? 'NEXT STEP' : archived ? 'PAST TRIP' : 'YOUR PLAN'}
              </p>
              <p
                className="truncate text-xs leading-5 text-foreground/85"
                title={nextAction ?? undefined}
              >
                {nextAction ?? (archived ? 'Revisit the itinerary' : 'Continue planning')}
              </p>
            </div>
            <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </Link>
      <TripIdeasPane isLoading={isLoadingProposals} items={proposals} trip={trip} />
    </article>
  );
}
