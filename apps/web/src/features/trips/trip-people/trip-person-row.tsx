import { ChevronRight } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPersonAvatar } from './trip-person-avatar';
import { TripPersonCard } from './trip-person-card';
import { personTrigger } from './trip-person-trigger';
import { handleLabel } from './trip-roster-groups';
import { TripSeatButton } from './trip-seat-button';
import { offersSeat } from './trip-seat-rules';
import { TripYouTag } from './trip-you-tag';

/**
 * One person in a Blocked, Deciding or Not going list. The face, name, @handle and status are one
 * button that opens the person's card (the status is a fixed column from the wide container, a line
 * under the name before that); a quiet chevron appears at its end on hover, focus and while open.
 * Cover €1 stays its own button at the end, where the viewer may pay it, outside the button's wash.
 */
export function TripPersonRow({
  actions,
  quiet = false,
  status,
  traveler
}: {
  actions: PeopleActions;
  /** Not going rows mute the face and name. */
  quiet?: boolean;
  /** The status, such as "Waiting on their seat". */
  status?: ReactNode;
  traveler: TripTraveler;
}) {
  const { seats } = actions;
  const isYou = traveler.userId === actions.viewerId;
  const showSeat =
    offersSeat(traveler, seats, { inCard: false, viewerId: actions.viewerId }) && seats;
  return (
    <li
      className="flex min-w-0 items-center border-t border-border first:border-t-0"
      data-traveler={traveler.userId}
    >
      <TripPersonCard actions={actions} traveler={traveler}>
        {({ faceRef }) => (
          <Button
            className={cn(
              personTrigger,
              'group/person flex min-w-0 flex-1 items-center gap-3 px-4 py-2'
            )}
            type="button"
            unstyled
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3">
              <span className="flex min-w-0 flex-1 items-center gap-3" ref={faceRef}>
                <TripPersonAvatar
                  className={quiet ? 'opacity-60' : undefined}
                  size="md"
                  traveler={traveler}
                />
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'truncate',
                      quiet ? 'text-muted-foreground' : 'font-medium text-foreground'
                    )}
                  >
                    {traveler.name}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted-foreground max-sm:hidden">
                    {handleLabel(traveler.handle)}
                  </span>
                  {isYou ? <TripYouTag /> : null}
                </span>
              </span>
              {status ? (
                <span className="flex basis-full items-center gap-2 pl-12 text-xs text-muted-foreground @3xl/people:w-44 @3xl/people:basis-auto @3xl/people:pl-0 @3xl/people:text-[13px]">
                  {status}
                </span>
              ) : null}
            </span>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/person:opacity-100 group-focus-visible/person:opacity-100 group-data-[state=open]/person:opacity-100 motion-reduce:transition-none"
            />
          </Button>
        )}
      </TripPersonCard>
      <div className="flex shrink-0 items-center justify-end gap-1 pr-4 pl-2 empty:hidden @3xl/people:w-40">
        {showSeat ? (
          <TripSeatButton
            disabled={seats.disabled || seats.pendingUserId !== null}
            isYou={isYou}
            name={traveler.name}
            onPay={() => seats.onPay(traveler.userId)}
            pending={seats.pendingUserId === traveler.userId}
          />
        ) : null}
      </div>
    </li>
  );
}
