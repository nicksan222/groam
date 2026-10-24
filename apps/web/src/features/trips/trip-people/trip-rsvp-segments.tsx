import { CircleCheck, Clock3 } from '@groam/icons';
import { SegmentedControl } from '@groam/ui/components/segmented-control';
import type { AssignableStatus } from '@/types/trips';
import { rsvpOptions } from './trip-rsvp-options';

/**
 * The viewer's own RSVP as a segmented radio group. The checked segment sits on the page
 * background; Going reads in success with a check, or in warning with a clock while it is held
 * (said yes, seat unpaid: checked for assistive technology, like the person card's Going row). Going waits for the seat on a trip that takes
 * payments (`goingReasonId` names the text saying so), and an archived trip locks the whole group.
 */
export function TripRsvpSegments({
  canGo,
  disabled,
  goingReasonId,
  held,
  onChange,
  value
}: {
  canGo: boolean;
  disabled: boolean;
  /** The id of the text explaining why Going is unavailable. */
  goingReasonId: string;
  /** Said yes but the seat is unpaid: Going stays checked, with a clock, until it is. */
  held: boolean;
  onChange: (status: AssignableStatus) => void;
  /** The viewer's RSVP; someone going without a seat still shows Going, locked until they pay. */
  value: AssignableStatus;
}) {
  const goingLocked = !canGo && !disabled;
  return (
    <SegmentedControl<AssignableStatus>
      attribute="data-rsvp"
      label="Your RSVP"
      onChange={onChange}
      options={rsvpOptions.map((option) => {
        const going = option.id === 'going';
        return {
          activeClassName: going ? goingTint(held) : undefined,
          describedBy: going && goingLocked ? goingReasonId : undefined,
          disabled: disabled || (going && !canGo),
          label: going ? <GoingLabel held={held} selected={value === 'going'} /> : option.label,
          title: going && goingLocked ? 'Your seat comes first.' : undefined,
          value: option.id
        };
      })}
      radio
      size="md"
      value={value}
    />
  );
}

function goingTint(held: boolean) {
  return held ? 'text-warning-foreground' : 'text-success-foreground';
}

/** Going's label: a clock while held, a check once cleared, nothing when not the answer. */
function GoingLabel({ held, selected }: { held: boolean; selected: boolean }) {
  const Icon = held ? Clock3 : CircleCheck;
  return (
    <>
      {selected ? <Icon className="size-4" /> : null}
      Going
    </>
  );
}
