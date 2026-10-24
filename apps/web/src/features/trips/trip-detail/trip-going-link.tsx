import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { avatarClasses, displayInitials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { peopleLabel } from './trip-people-label';

/**
 * Who is going, as a link to People: overlapping faces under a ring in the page background, then
 * the count. From `md` it is a ghost-like 32px link in the header's action cluster (faces only
 * below `lg`, the count kept in its accessible name); on a phone, `compact`, it is a quiet part of
 * Plan's facts line with up to three bare hue discs.
 */
export function TripGoingLink({
  compact = false,
  tripReference,
  trip
}: {
  compact?: boolean;
  trip: Pick<TripDetail, 'groupMemberCount' | 'id' | 'travelerCount'>;
  tripReference: string;
}) {
  const { isLoading, travelers } = useTripTravelers(trip.id);
  const maxFaces = compact ? 3 : 4;
  const going = travelers.filter((traveler) => traveler.status === 'going').slice(0, maxFaces);
  const discSize = compact ? 'size-5' : 'size-6';
  return (
    <Link
      className={cn(
        'group flex shrink-0 items-center whitespace-nowrap text-muted-foreground transition-colors',
        compact
          ? 'gap-2 underline-offset-4 hover:text-foreground hover:underline'
          : 'h-8 gap-2 rounded-lg pl-1 pr-2 text-[13px] font-medium hover:bg-muted hover:text-foreground'
      )}
      data-testid={testIds.tripPeopleLink}
      params={{ section: 'people', tripId: tripReference }}
      to="/trips/$tripId/$section"
    >
      <span
        aria-hidden
        className="flex items-center -space-x-1 dark:saturate-150"
        data-slot="trip-going-faces"
      >
        {isLoading
          ? Array.from({ length: Math.min(trip.travelerCount, maxFaces) }, (_, index) => (
              <span
                className={cn('rounded-full bg-muted ring-[1.5px] ring-background', discSize)}
                // oxlint-disable-next-line react/no-array-index-key -- identical placeholders
                key={index}
              />
            ))
          : going.map((traveler) => (
              <Avatar
                className={cn(
                  'ring-[1.5px] ring-background transition-shadow group-hover:ring-muted',
                  discSize
                )}
                key={traveler.userId}
              >
                {compact ? null : <AvatarImage alt="" src={traveler.image ?? ''} />}
                <AvatarFallback
                  className={cn(
                    'text-[9px] font-semibold tracking-normal',
                    avatarClasses(traveler.name)
                  )}
                >
                  {compact ? null : displayInitials(traveler.name)}
                </AvatarFallback>
              </Avatar>
            ))}
      </span>
      {peopleLabel(trip)}
    </Link>
  );
}
