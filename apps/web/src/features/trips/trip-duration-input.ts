import type { TripDurationInput, TripDurationSource } from '@/types/trips';

export type { TripDurationInput, TripDurationSource };

export function tripDurationInput(trip: TripDurationSource, totalDays: number): TripDurationInput;
export function tripDurationInput(
  trip: TripDurationSource,
  totalDays: undefined
): TripDurationInput | undefined;
export function tripDurationInput(
  trip: TripDurationSource,
  totalDays: number | undefined
): TripDurationInput | undefined;
export function tripDurationInput(
  trip: TripDurationSource,
  totalDays: number | undefined
): TripDurationInput | undefined {
  const duration = {
    ...(trip.idealDurationDays === null ? {} : { idealDays: trip.idealDurationDays }),
    ...(trip.minimumDurationDays === null ? {} : { minimumDays: trip.minimumDurationDays }),
    ...(totalDays === undefined ? {} : { totalDays })
  };
  return Object.keys(duration).length === 0 ? undefined : duration;
}
