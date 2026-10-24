import { Ban, CircleCheck, CircleDashed } from '@groam/icons';
import type { ComponentType } from 'react';
import type { AssignableStatus, RosterStatus } from '@/types/trips';

/** The RSVPs a person can pick, in the order every control lists them. */
export const rsvpOptions: Array<{
  icon: ComponentType<{ className?: string }>;
  id: AssignableStatus;
  label: string;
}> = [
  { icon: CircleCheck, id: 'going', label: 'Going' },
  { icon: CircleDashed, id: 'maybe', label: 'Maybe' },
  { icon: Ban, id: 'not_going', label: 'Not going' }
];

/** What each roster status reads as in an RSVP control; `invited` is going without a seat. */
export const rsvpLabels: Record<RosterStatus, string> = {
  going: 'Going',
  invited: 'Needs a seat',
  maybe: 'Maybe',
  not_going: 'Not going'
};
