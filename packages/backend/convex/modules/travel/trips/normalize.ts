import { ConvexError, type Infer } from 'convex/values';
import type { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { type TripCostSplit, tripCostSplit } from '#convex/modules/travel/trips/costs';
import { LocalDateTime } from '#convex/modules/travel/trips/datetime';
import {
  MAX_TRIP_BUDGET,
  MAX_TRIP_DATE_NOTES_LENGTH,
  MAX_TRIP_DESTINATION_NAME_LENGTH,
  MAX_TRIP_DESTINATION_PLACE_ID_LENGTH,
  MAX_TRIP_DAYS,
  MAX_TRIP_NAME_LENGTH
} from '#convex/modules/travel/trips/lengths';
import type { TripValidators } from '#convex/modules/travel/trips/schema';

export type TripDestinationInput = Infer<typeof TripDestinationValidators.destination>;
export type TripInformationInput = Infer<typeof TripValidators.information>;
export type TripUpdateInput = Infer<typeof TripValidators.updateInput>;

export function validateCoordinates(
  coordinates: { latitude: number; longitude: number },
  label: string
): void {
  if (
    !Number.isFinite(coordinates.latitude) ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90
  ) {
    throw new ConvexError(`${label} latitude must be between -90 and 90`);
  }
  if (
    !Number.isFinite(coordinates.longitude) ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180
  ) {
    throw new ConvexError(`${label} longitude must be between -180 and 180`);
  }
}

export function normalizeRequiredText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ConvexError(`${field} must be between 1 and ${maxLength} characters`);
  }
  return normalized;
}

export function normalizeOptionalText(value: string | undefined, field: string, maxLength: number) {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  if (normalized.length > maxLength) {
    throw new ConvexError(`${field} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

export function normalizeCost(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > MAX_TRIP_BUDGET)) {
    throw new ConvexError(`${label} must be between zero and ${MAX_TRIP_BUDGET}`);
  }
  return value;
}

export function normalizeCostRecord(
  cost: { amount?: number; split?: TripCostSplit } | undefined,
  label: string
): { amount: number; split: TripCostSplit } | undefined {
  const amount = normalizeCost(cost?.amount, label);
  if (amount === undefined) return undefined;
  return { amount, split: tripCostSplit(cost?.split) };
}

function normalizeBudget(value: number | undefined) {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > MAX_TRIP_BUDGET)) {
    throw new ConvexError(
      `initial budget must be greater than zero and no more than ${MAX_TRIP_BUDGET}`
    );
  }
  return value;
}

function normalizeDuration(value: number | undefined, field: string) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 1 || value > MAX_TRIP_DAYS) {
    throw new ConvexError(`${field} must be a whole number between 1 and ${MAX_TRIP_DAYS}`);
  }
  return value;
}

function normalizeTripDuration(input: TripUpdateInput['duration']) {
  const minimumDays = normalizeDuration(input?.minimumDays, 'minimum duration');
  const idealDays = normalizeDuration(input?.idealDays, 'ideal duration');
  const totalDays = normalizeDuration(
    input?.totalDays ?? idealDays ?? minimumDays,
    'total trip duration'
  );
  if (minimumDays !== undefined && idealDays !== undefined && idealDays < minimumDays) {
    throw new ConvexError('ideal duration cannot be shorter than minimum duration');
  }
  if (minimumDays !== undefined && totalDays !== undefined && totalDays < minimumDays) {
    throw new ConvexError('total trip duration cannot be shorter than minimum duration');
  }
  if (idealDays === undefined && minimumDays === undefined && totalDays === undefined) {
    return undefined;
  }
  return {
    ...(idealDays === undefined ? {} : { idealDays }),
    ...(minimumDays === undefined ? {} : { minimumDays }),
    ...(totalDays === undefined ? {} : { totalDays })
  };
}

export function normalizeKnownDestination(
  destination: Extract<TripDestinationInput, { status: 'known' }>
): Extract<TripDestinationInput, { status: 'known' }> {
  const countryCode = destination.countryCode?.trim().toUpperCase();
  if (countryCode !== undefined && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new ConvexError('destination country code must contain two letters');
  }
  const name = normalizeRequiredText(
    destination.name,
    'destination',
    MAX_TRIP_DESTINATION_NAME_LENGTH
  );
  if (!('coordinates' in destination)) {
    return {
      ...(countryCode ? { countryCode } : {}),
      name,
      status: 'known' as const
    };
  }
  validateCoordinates(destination.coordinates, 'destination');
  return {
    ...(countryCode ? { countryCode } : {}),
    coordinates: destination.coordinates,
    name,
    placeId: normalizeRequiredText(
      destination.placeId,
      'destination place id',
      MAX_TRIP_DESTINATION_PLACE_ID_LENGTH
    ),
    status: 'known' as const
  };
}

export function normalizeDetails(input: TripUpdateInput) {
  const budgetAmount = normalizeBudget(input.budget?.amount);
  const destination =
    input.destination.status === 'known'
      ? normalizeKnownDestination(input.destination)
      : { status: 'undecided' as const };
  const duration = normalizeTripDuration(input.duration);
  const startDate = LocalDateTime.normalizeDate(input.startDate, 'trip start date');

  return {
    ...(budgetAmount === undefined ? {} : { budget: { amount: budgetAmount } }),
    currency: input.currency,
    dateNotes: normalizeOptionalText(input.dateNotes, 'date notes', MAX_TRIP_DATE_NOTES_LENGTH),
    destination,
    ...(duration ? { duration } : {}),
    name: normalizeRequiredText(input.name, 'trip name', MAX_TRIP_NAME_LENGTH),
    ...(startDate ? { startDate } : {})
  };
}
