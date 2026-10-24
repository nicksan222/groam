import type { RosterStatus } from '@/types/trips';

/**
 * How each readiness state reads, in the seat strip's faces and the legend's swatches alike. `ring`
 * goes on the face's wrapper and `fade` on the face itself: cleared is a full face, blocked wears a
 * warning ring, deciding is faded behind a dashed outline, out is faint.
 */
export const FACE_STATES: Record<
  RosterStatus,
  { fade: string; label: string; name: string; ring: string }
> = {
  going: { fade: '', label: 'cleared', name: 'Cleared', ring: '' },
  invited: {
    fade: '',
    label: 'blocked',
    name: 'Blocked',
    ring: 'ring-2 ring-warning ring-offset-1 ring-offset-background'
  },
  maybe: {
    fade: 'opacity-55',
    label: 'deciding',
    name: 'Deciding',
    ring: 'outline-[1.5px] outline-offset-1 outline-input outline-dashed'
  },
  not_going: { fade: 'opacity-25', label: 'out', name: 'Not going', ring: '' }
};

/** The states in the order the strip, the bar and the legend list them. */
export const FACE_ORDER = ['going', 'invited', 'maybe', 'not_going'] as const;

/** Without payments nobody is blocked and “cleared” simply reads “going”. */
export function faceLabel(status: RosterStatus, takesPayments: boolean) {
  return status === 'going' && !takesPayments ? 'going' : FACE_STATES[status].label;
}

export function faceName(status: RosterStatus, takesPayments: boolean) {
  return status === 'going' && !takesPayments ? 'Going' : FACE_STATES[status].name;
}
