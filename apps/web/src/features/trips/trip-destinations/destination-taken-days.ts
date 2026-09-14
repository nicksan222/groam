import type { ScheduledDestination } from '@/types/trips';

export type { ScheduledDestination };

export function destinationTakenDays(
  destinations: readonly ScheduledDestination[],
  destinationId: string,
  minimumDay: number,
  maximumDay: number
): ReadonlySet<number> {
  const taken = new Set<number>();
  for (const destination of destinations) {
    if (destination.id === destinationId) continue;
    if (destination.startDay == null || destination.endDay == null) continue;
    for (let day = destination.startDay; day <= destination.endDay; day++) {
      if (day === minimumDay && day === destination.endDay) continue;
      if (day >= minimumDay && day <= maximumDay && day === destination.startDay) continue;
      taken.add(day);
    }
  }
  return taken;
}
