import { useId } from 'react';
import type { PeopleActions, SeatActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPassStub } from './trip-pass-stub';
import { TripPersonAvatar } from './trip-person-avatar';
import { TripRsvpSegments } from './trip-rsvp-segments';
import { TripSeatButton } from './trip-seat-button';
import { canGo } from './trip-seat-rules';

/** Where the viewer stands; going names the place, which leads the eye over the muted lead-in. */
function TitleFor({ place, viewer }: { place: string | undefined; viewer: TripTraveler }) {
  if (viewer.status === 'going' && place) {
    return (
      <>
        <span className="font-medium text-muted-foreground">You’re going to </span>
        {place}
      </>
    );
  }
  return {
    going: 'You’re going',
    invited: 'You said yes — your seat is next',
    maybe: 'You’re a maybe',
    not_going: 'You’re not going'
  }[viewer.status];
}

/** The muted line under the title: what to do next, or what the viewer can do. */
function subtitleFor(viewer: TripTraveler, actions: PeopleActions) {
  if (actions.archived) return 'This trip is archived.';
  if (viewer.status === 'invited') return 'Pay your €1 seat and you’re going.';
  if (viewer.status === 'maybe' && !canGo(viewer, actions.seats)) {
    return 'Going needs your €1 seat first.';
  }
  if (actions.isOrganizer) {
    return actions.seats
      ? 'Organizer · you can move anyone and cover their seat.'
      : 'Organizer · you can move anyone.';
  }
  return 'Change your answer any time.';
}

/** The pass's seat stub: Free, Paid, or €1 due with the pay button. */
function SeatStub({ seats, viewer }: { seats: SeatActions; viewer: TripTraveler }) {
  if (!seats.hasSeat(viewer.userId)) {
    return (
      <TripPassStub value="€1 due">
        {seats.canPay(viewer) ? (
          <TripSeatButton
            disabled={seats.disabled || seats.pendingUserId !== null}
            isYou
            name={viewer.name}
            onPay={() => seats.onPay(viewer.userId)}
            pending={seats.pendingUserId === viewer.userId}
          />
        ) : null}
      </TripPassStub>
    );
  }
  return seats.isFree(viewer.userId) ? (
    <TripPassStub value="Free">You created the trip</TripPassStub>
  ) : (
    <TripPassStub value="Paid">Paid once</TripPassStub>
  );
}

/**
 * Your pass, a boarding pass: the viewer's face, where they stand (the destination leading the
 * title), the trip's dates and length, and what to do next; the segmented RSVP they change it with;
 * and (on trips that take payments) the stub saying what their seat is.
 */
export function TripYourPass({
  actions,
  place,
  viewer,
  when
}: {
  actions: PeopleActions;
  /** The trip's destination, when it has one. */
  place: string | undefined;
  viewer: TripTraveler;
  /** The trip's dates and length, as the sidebar writes them, when it has either. */
  when: string | null;
}) {
  const reasonId = useId();
  return (
    <section
      aria-label="Your pass"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-card @3xl/people:flex-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 p-4 @3xl/people:px-6">
        <TripPersonAvatar size="lg" traveler={viewer} />
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-semibold tracking-tight">
            <TitleFor place={place} viewer={viewer} />
          </h3>
          {when ? <p className="text-sm text-foreground">{when}</p> : null}
          <p className="text-sm text-muted-foreground">{subtitleFor(viewer, actions)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center px-4 pb-4 @3xl/people:px-6 @3xl/people:pb-0">
        <TripRsvpSegments
          canGo={canGo(viewer, actions.seats)}
          disabled={actions.archived}
          goingReasonId={reasonId}
          held={viewer.status === 'invited'}
          onChange={(status) => {
            void actions.onChange(status, viewer.userId);
          }}
          value={viewer.status === 'invited' ? 'going' : viewer.status}
        />
        <span className="sr-only" id={reasonId}>
          Going needs your seat first.
        </span>
      </div>
      {actions.seats ? <SeatStub seats={actions.seats} viewer={viewer} /> : null}
    </section>
  );
}
