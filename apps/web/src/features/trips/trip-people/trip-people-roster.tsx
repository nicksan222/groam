import Shell from '@groam/ui/components/shell/client';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripBlockedGroup } from './trip-blocked-group';
import { TripClearedGroup } from './trip-cleared-group';
import { TripDecidingGroup } from './trip-deciding-group';
import { TripOutGroup } from './trip-out-group';
import { TripReadiness } from './trip-readiness';
import { groupRoster } from './trip-roster-groups';
import { TripYourPass } from './trip-your-pass';

/**
 * The boarding manifest: your pass (when you are on the roster), how ready the group is, then
 * Blocked, Deciding, Cleared and Not going, each only when somebody is in it. Everyone appears once.
 */
export function TripPeopleRoster({
  actions,
  onOutOpenChange,
  outOpen,
  perTraveler,
  place,
  summaryTestId,
  travelers,
  when
}: {
  actions: PeopleActions;
  onOutOpenChange: (open: boolean) => void;
  /** Whether the Not going list is unfolded; the panel owns it so a person moved there is revealed. */
  outOpen: boolean;
  perTraveler: string | undefined;
  /** The trip's destination, when it has one. */
  place: string | undefined;
  summaryTestId: string;
  travelers: TripTraveler[];
  /** The trip's dates and length, when it has either. */
  when: string | null;
}) {
  const groups = groupRoster(travelers, actions.viewerId);
  const viewer = travelers.find((traveler) => traveler.userId === actions.viewerId);
  const takesPayments = actions.seats !== null;
  return (
    <Shell.Stack className="@container/people" stack="page">
      {viewer ? <TripYourPass actions={actions} place={place} viewer={viewer} when={when} /> : null}
      <TripReadiness
        counts={actions.counts}
        groups={groups}
        perTraveler={perTraveler}
        takesPayments={takesPayments}
        testId={summaryTestId}
      />
      {groups.invited.length > 0 ? (
        <TripBlockedGroup actions={actions} travelers={groups.invited} />
      ) : null}
      {groups.maybe.length > 0 ? (
        <TripDecidingGroup actions={actions} travelers={groups.maybe} />
      ) : null}
      {groups.going.length > 0 ? (
        <TripClearedGroup actions={actions} travelers={groups.going} />
      ) : null}
      {groups.not_going.length > 0 ? (
        <TripOutGroup
          actions={actions}
          onOpenChange={onOutOpenChange}
          open={outOpen}
          travelers={groups.not_going}
        />
      ) : null}
      {takesPayments ? (
        <p className="text-xs text-muted-foreground">
          Everyone going needs a €1 seat. Checkout opens on Stripe.
        </p>
      ) : null}
    </Shell.Stack>
  );
}
