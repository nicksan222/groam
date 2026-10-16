import { motionSafeScrollBehavior } from '@groam/ui/lib/utils';

function jumpTo(elementId: string) {
  const target = document.getElementById(elementId);
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: motionSafeScrollBehavior(), block: 'start' });
}

export function jumpToDay(day: number) {
  jumpTo(`trip-day-${day}`);
}

export function jumpToStop(id: string, day?: number | null) {
  if (day) jumpToDay(day);
  else jumpTo(`itinerary-stop-${id}`);
}
