import type { TripDetail } from '@/features/trips/hooks/use-trips';

export function tripHeroFactsLine({
  destinationCount,
  ideaAuthorName,
  role,
  sourceTripName,
  trip
}: {
  destinationCount: number;
  ideaAuthorName?: string;
  role: TripDetail['role'];
  sourceTripName?: string;
  travelerCount?: number;
  trip: TripDetail;
}) {
  const stops = `${destinationCount} stop${destinationCount === 1 ? '' : 's'}`;
  if (trip.proposal) {
    const author = ideaAuthorName ?? trip.proposal.author.name;
    return [sourceTripName ? `Idea on ${sourceTripName}` : 'Idea', `by ${author}`, stops].join(
      ' · '
    );
  }
  const isSharedProtected = !trip.permissions.canEdit;
  return [isSharedProtected ? 'Shared trip' : 'Planning', roleLabel(role), stops].join(' · ');
}

function roleLabel(role: TripDetail['role']) {
  return role === 'organizer' ? 'Organizer' : 'Member';
}
