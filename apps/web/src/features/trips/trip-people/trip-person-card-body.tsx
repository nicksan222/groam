import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPersonCardChoices } from './trip-person-card-choices';
import { TripPersonCardHeader } from './trip-person-card-header';
import { readOnlyLine } from './trip-person-card-model';
import { TripPersonCardSeat } from './trip-person-card-seat';

/**
 * What a person's card says, top to bottom: who they are and where they stand, their seat (on
 * trips that take payments), and, where the viewer may change it, their RSVP. An archived trip
 * says it is read-only, and so does a card the viewer may not change. After a change the card
 * closes and the manifest follows the person to their new place.
 */
export function TripPersonCardBody({
  actions,
  onClose,
  sheet,
  traveler
}: {
  actions: PeopleActions;
  onClose: () => void;
  /** Rendered in a sheet, whose title is the person's name. */
  sheet: boolean;
  traveler: TripTraveler;
}) {
  const isYou = traveler.userId === actions.viewerId;
  const choices = !actions.archived && actions.canChange(traveler);
  return (
    <>
      <TripPersonCardHeader
        chip={!choices}
        isYou={isYou}
        sheet={sheet}
        takesPayments={actions.seats !== null}
        traveler={traveler}
      />
      {actions.seats ? (
        <TripPersonCardSeat
          isYou={isYou}
          seats={actions.seats}
          traveler={traveler}
          viewerId={actions.viewerId}
          withAction={!choices}
        />
      ) : null}
      {actions.archived ? (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          This trip is archived.
        </p>
      ) : choices ? (
        <TripPersonCardChoices
          actions={actions}
          isYou={isYou}
          onDone={onClose}
          traveler={traveler}
        />
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {readOnlyLine(traveler)}
        </p>
      )}
    </>
  );
}
