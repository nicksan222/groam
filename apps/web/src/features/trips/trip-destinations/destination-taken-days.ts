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
    addDestinationTakenDays({ destination, destinationId, maximumDay, minimumDay, taken });
  }
  return taken;
}

function addDestinationTakenDays({
  destination,
  destinationId,
  maximumDay,
  minimumDay,
  taken
}: {
  destination: ScheduledDestination;
  destinationId: string;
  maximumDay: number;
  minimumDay: number;
  taken: Set<number>;
}) {
  if (
    destination.id === destinationId ||
    destination.startDay == null ||
    destination.endDay == null
  )
    return;
  for (let day = destination.startDay; day <= destination.endDay; day++) {
    if (day === minimumDay && day === destination.endDay) continue;
    if (day >= minimumDay && day <= maximumDay && day === destination.startDay) continue;
    taken.add(day);
  }
}
