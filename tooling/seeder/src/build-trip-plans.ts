import type { CreateTripPlan } from '@groam/app-actions/backend';
import { seedDestinationAt } from './seed-destinations';
import { seedRegionalStops } from './seed-regional-stops';

export type SeedTripPlan = {
  additionalDestinations: CreateTripPlan['additionalDestinations'];
  archived: boolean;
  create: CreateTripPlan['create'];
};

const periods = [
  'A long weekend in early spring',
  'Flexible dates in late April',
  'The first half of June',
  'Around the August bank holiday',
  'A week in September',
  'Late October, avoiding school holidays',
  'Between Christmas and New Year',
  'Any quiet week in February'
];

export function buildTripPlans(tripCount: number): SeedTripPlan[] {
  return Array.from({ length: tripCount }, (_, index) => buildTripPlan(index, tripCount));
}

function extraStopCount(index: number, undecided: boolean): number {
  if (undecided) return 0;
  if (index % 4 === 0) return 2;
  return index % 3 === 0 ? 1 : 0;
}

function buildTripPlan(index: number, tripCount: number): SeedTripPlan {
  const destination = seedDestinationAt(index);
  const undecided = index % 5 === 4;
  const minimumDurationDays = 3 + (index % 5);
  const idealDurationDays = minimumDurationDays + 2 + (index % 4);
  const stops = extraStopCount(index, undecided);
  const sequence = String(index + 1).padStart(2, '0');
  const themes = [
    'food & neighborhoods',
    'culture by rail',
    'slow travel',
    'outdoors & weather backups'
  ];
  const name = undecided
    ? `Autumn getaway — destination shortlist ${sequence}`
    : `${destination.name.split(',')[0]} · ${themes[index % themes.length]} ${sequence}`;
  const create: SeedTripPlan['create'] = {
    clientRequestId: `seed:v2:trip:${String(index + 1).padStart(4, '0')}`,
    budget: { amount: localBudget(destination.currency, index) },
    currency: destination.currency,
    dateNotes:
      index % 3 === 1
        ? 'Dates agreed; rooms and rail tickets still need checking. Group budget, excluding international flights.'
        : periods[index % periods.length],
    ...(index % 3 === 1
      ? { startDate: `2027-${String(3 + (index % 6)).padStart(2, '0')}-12` }
      : {}),
    destination: undecided
      ? { status: 'undecided' }
      : {
          countryCode: destination.countryCode,
          coordinates: {
            latitude: destination.latitude,
            longitude: destination.longitude
          },
          name: destination.name,
          placeId: destination.placeId,
          status: 'known'
        },
    duration: {
      idealDays: idealDurationDays,
      minimumDays: minimumDurationDays,
      totalDays: Math.max(idealDurationDays, 2 + stops * 2)
    },
    name
  };
  return {
    additionalDestinations: additionalDestinations(
      index,
      stops,
      undecided,
      create.duration?.totalDays ?? idealDurationDays
    ),
    archived: tripCount >= 4 && index > 0 && (index % 9 === 0 || index === tripCount - 1),
    create
  };
}

function additionalDestinations(
  index: number,
  count: number,
  undecided: boolean,
  totalDays: number
) {
  if (undecided) return [];
  return seedRegionalStops(index, count).map((stop, stopIndex) => ({
    countryCode: stop.countryCode,
    coordinates: { latitude: stop.latitude, longitude: stop.longitude },
    dayNotes: `Transfer after breakfast. Leave time to check in before exploring ${stop.name.split(',')[0]}.`,
    name: stop.name,
    placeId: stop.placeId,
    schedule: {
      endDay: stopIndex === count - 1 ? totalDays : stopIndex * 2 + 5,
      startDay: stopIndex * 2 + 3
    },
    status: 'known' as const
  }));
}

function localBudget(currency: string, index: number): number {
  // Illustrative group budgets in each destination's own currency, not FX conversions.
  const budgets: Record<string, number> = {
    EUR: 2400,
    JPY: 420000,
    MXN: 48000,
    ISK: 460000,
    MAD: 22000,
    NZD: 5200,
    CAD: 4200,
    THB: 68000,
    USD: 3600,
    ZAR: 48000,
    NOK: 38000
  };
  return Math.round((budgets[currency] ?? 3000) * (1 + (index % 4) * 0.15));
}
