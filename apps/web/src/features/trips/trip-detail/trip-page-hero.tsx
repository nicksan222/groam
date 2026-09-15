import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { closedWithoutApplying, ideaOnTripSubtitle } from '@/features/ideas/idea-glossary';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripTravelersSheet } from '@/features/trips/trip-travelers/trip-travelers-sheet';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { TripHeroCover } from './trip-hero-cover';
import { tripHeroFactsLine } from './trip-hero-facts';
import { TripHeroMeta } from './trip-hero-meta';
import { TripHeroTitle } from './trip-hero-title';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripPageHeroLoadedProps = {
  actions: ReactNode;
  compact?: boolean;
  isLoading?: false;
  onRosterOpenChange?: (open: boolean) => void;
  retryCover: () => Promise<boolean>;
  rosterOpen?: boolean;
  sourceTripName?: string;
  trip: TripDetail;
  tripId: Id<'trips'>;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripPageHeroLoadingProps = {
  actions?: ReactNode;
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripPageHeroProps = TripPageHeroLoadedProps | TripPageHeroLoadingProps;

export function TripPageHero(props: TripPageHeroProps) {
  if (props.isLoading) {
    return (
      <Shell.BannerHero aria-busy="true" aria-label="Loading trip header">
        <div className="relative w-14 min-w-12 shrink self-stretch overflow-hidden rounded-lg border border-border bg-muted/40 sm:w-20 sm:shrink-0">
          <div className="absolute inset-0 grid place-items-center">
            <MapPinned className="size-4 text-muted-foreground/40" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-48 max-w-full sm:h-8 sm:w-64" />
          <Skeleton className="mt-1 h-5 w-36 max-w-full" />
          <Skeleton className="mt-2 h-3 w-52 max-w-full" />
        </div>
        {props.actions ? (
          <div className="flex basis-full justify-end sm:basis-auto sm:shrink-0 sm:self-start">
            {props.actions}
          </div>
        ) : (
          <div className="hidden shrink-0 self-start sm:block">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        )}
      </Shell.BannerHero>
    );
  }

  return <TripPageHeroLoaded {...props} />;
}

function TripPageHeroLoaded({
  actions,
  compact = false,
  onRosterOpenChange,
  retryCover,
  rosterOpen,
  sourceTripName,
  trip,
  tripId
}: TripPageHeroLoadedProps) {
  const idea = useOptionalIdeaContext();
  const { goingCount } = useTripTravelers(trip.proposal ? undefined : tripId);
  const internalRoster = useOpenState(false);
  const rosterIsOpen = rosterOpen ?? internalRoster.open;
  const setRosterOpen = onRosterOpenChange ?? internalRoster.setOpen;
  const ideaTitle = idea?.proposal?.title;
  const displayTitle = ideaTitle ?? trip.name;
  const location =
    trip.destination.status === 'known' ? trip.destination.name : 'Destination undecided';
  const subtitle = ideaTitle
    ? ideaOnTripSubtitle(sourceTripName ?? idea.sharedTrip?.name ?? trip.name)
    : location;
  const travelerCount = goingCount > 0 ? goingCount : trip.groupMemberCount;
  const factsLine = tripHeroFactsLine({
    destinationCount: trip.destinations.length,
    ideaAuthorName: idea?.proposal?.author.name ?? trip.proposal?.author.name,
    role: trip.role,
    sourceTripName: sourceTripName ?? idea?.sharedTrip?.name,
    travelerCount,
    trip
  });
  const closedNote =
    idea?.proposal?.status === 'closed' ? closedWithoutApplying(idea.proposal.closeReason) : null;
  const metaLine = [factsLine, closedNote].filter(Boolean).join(' · ');

  return (
    <Shell.BannerHero>
      {!compact && <TripHeroCover retryCover={retryCover} trip={trip} />}
      <div className="min-w-0 flex-1">
        <TripHeroTitle
          conflictCount={idea?.proposal?.conflicts.length}
          displayTitle={displayTitle}
          status={idea?.proposal?.status}
          tripId={tripId}
          tripName={trip.name}
        />
        <TripHeroMeta
          compact={compact}
          destinationStatus={trip.destination.status}
          hasIdeaTitle={Boolean(ideaTitle)}
          isProposal={Boolean(trip.proposal)}
          metaLine={metaLine}
          onOpenRoster={() => setRosterOpen(true)}
          role={trip.role}
          subtitle={subtitle}
          travelerCount={travelerCount}
        />
      </div>
      {actions ? (
        <div className="flex basis-full justify-end sm:basis-auto sm:shrink-0 sm:self-start">
          {actions}
        </div>
      ) : null}
      {trip.proposal ? null : (
        <TripTravelersSheet
          onOpenChange={setRosterOpen}
          open={rosterIsOpen}
          tripId={tripId}
          tripName={trip.name}
        />
      )}
    </Shell.BannerHero>
  );
}
