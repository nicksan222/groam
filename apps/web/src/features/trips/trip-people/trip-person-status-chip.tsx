import { chip, chipTint } from '@groam/ui/lib/chip';
import { cn } from '@groam/ui/lib/utils';
import type { RosterStatus } from '@/types/trips';
import { rsvpLabels } from './trip-rsvp-options';

const TONES: Record<RosterStatus, string> = {
  going: chipTint.success,
  invited: chipTint.warning,
  maybe: '',
  not_going: 'bg-transparent ring-1 ring-border ring-inset'
};

/** Where a person stands, as the chip at the right of their card's header. */
export function TripPersonStatusChip({ status }: { status: RosterStatus }) {
  return <span className={cn(chip, 'shrink-0', TONES[status])}>{rsvpLabels[status]}</span>;
}
