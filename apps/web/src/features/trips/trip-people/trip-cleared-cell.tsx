import { Check } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPersonAvatar } from './trip-person-avatar';
import { TripPersonCard } from './trip-person-card';
import { personTrigger } from './trip-person-trigger';
import { TripYouTag } from './trip-you-tag';

/**
 * One cell of the Cleared grid. The whole cell is a button that opens the person's card beside
 * them: face, name and a quiet success check. The viewer's own cell carries a "You" tag, a primary
 * wash and the queue's 2px bar.
 */
export function TripClearedCell({
  actions,
  traveler
}: {
  actions: PeopleActions;
  traveler: TripTraveler;
}) {
  const isYou = traveler.userId === actions.viewerId;
  return (
    <li className="min-w-0 bg-background" data-traveler={traveler.userId}>
      <TripPersonCard actions={actions} side="right" traveler={traveler}>
        {({ faceRef }) => (
          <Button
            className={cn(
              personTrigger,
              'flex w-full items-center gap-3 px-4 py-2',
              isYou &&
                'bg-primary/10 shadow-[inset_2px_0_0_var(--color-primary)] hover:bg-primary/15 data-[state=open]:bg-primary/20'
            )}
            type="button"
            unstyled
          >
            <span className="flex min-w-0 items-center gap-3" ref={faceRef}>
              <TripPersonAvatar size="sm" traveler={traveler} />
              <span
                className={cn(
                  'min-w-0 truncate text-sm',
                  isYou ? 'font-medium' : 'text-foreground'
                )}
              >
                {traveler.name}
              </span>
            </span>
            {isYou ? <TripYouTag onWash /> : null}
            <Check
              aria-hidden
              className="ml-auto size-3.5 shrink-0 text-success-foreground opacity-70"
            />
          </Button>
        )}
      </TripPersonCard>
    </li>
  );
}
