import { DestinationDaySlots } from '@/features/trips/trip-destinations/destination-day-slots';
import { destinationTakenDays } from '@/features/trips/trip-destinations/destination-taken-days';
import type { Destination } from './destination-types';

export function ScheduledDestinationDays({
  canManage,
  destination,
  destinations,
  endDay,
  isPending,
  maximumDay,
  minimumDay,
  setEndDay,
  setStartDay,
  startDate,
  startDay,
  tripDayCount
}: {
  canManage: boolean;
  destination: Destination;
  destinations: readonly Destination[];
  endDay: string;
  isPending: boolean;
  maximumDay: number | null;
  minimumDay: number;
  setEndDay: (value: string) => void;
  setStartDay: (value: string) => void;
  startDate: null | string;
  startDay: string;
  tripDayCount: number | null;
}) {
  if (tripDayCount === null) return null;
  const takenDays = destinationTakenDays(
    destinations,
    destination.id,
    minimumDay,
    maximumDay ?? tripDayCount
  );
  return (
    <DestinationDaySlots
      destinationName={destination.name}
      disabled={!canManage || isPending}
      endDay={endDay === '' ? undefined : Number(endDay)}
      maximumDay={maximumDay ?? tripDayCount}
      minimumDay={minimumDay}
      onChange={(nextStartDay, nextEndDay) => {
        setStartDay(nextStartDay === undefined ? '' : String(nextStartDay));
        setEndDay(nextEndDay === undefined ? '' : String(nextEndDay));
      }}
      startDate={startDate}
      startDay={startDay === '' ? undefined : Number(startDay)}
      takenDays={takenDays}
      totalDays={tripDayCount}
    />
  );
}
