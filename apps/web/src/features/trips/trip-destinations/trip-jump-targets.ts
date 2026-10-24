import { motionSafeScrollBehavior } from '@groam/ui/lib/utils';

/** The trip calendar listens for this to move to a trip day; `detail` is the day number. */
export const tripDayJumpEvent = 'groam:trip-day-jump';

function jumpTo(elementId: string) {
  const target = document.getElementById(elementId);
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: motionSafeScrollBehavior(), block: 'start' });
}

/** Brings a trip day into view: its day card in the editor, or its column on the overview calendar. */
export function jumpToDay(day: number) {
  jumpTo(`trip-day-${day}`);
  window.dispatchEvent(new CustomEvent(tripDayJumpEvent, { detail: day }));
}

export function jumpToStop(id: string, day?: number | null) {
  if (day) jumpToDay(day);
  else jumpTo(`itinerary-stop-${id}`);
}
