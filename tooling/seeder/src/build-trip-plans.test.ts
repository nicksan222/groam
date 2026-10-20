import { expect, test } from 'vite-plus/test';
import { buildTripPlans } from './build-trip-plans';

test('builds deterministic destination and archive variety', () => {
  const plans = buildTripPlans(20);

  expect(plans).toHaveLength(20);
  expect(plans.some(({ create }) => create.destination.status === 'undecided')).toBe(true);
  expect(plans.some(({ archived }) => archived)).toBe(true);
  expect(plans.some(({ additionalDestinations }) => additionalDestinations.length > 1)).toBe(true);
  expect(
    plans.every(({ additionalDestinations, create }) =>
      additionalDestinations.every(
        ({ schedule }) =>
          schedule === undefined || schedule.endDay <= (create.duration?.totalDays ?? 0)
      )
    )
  ).toBe(true);
  expect(new Set(plans.map(({ create }) => create.clientRequestId)).size).toBe(20);
  expect(new Set(plans.map(({ create }) => create.name)).size).toBe(20);
  expect(
    plans.every(({ additionalDestinations, create }) => {
      const placeIds = [
        ...(create.destination.status === 'known' && 'placeId' in create.destination
          ? [create.destination.placeId]
          : []),
        ...additionalDestinations.map(({ placeId }) => placeId)
      ];
      return new Set(placeIds).size === placeIds.length;
    })
  ).toBe(true);
});

test('keeps multi-stop journeys regional and budgets plausible in their local currency', () => {
  const plans = buildTripPlans(24);
  for (const plan of plans) {
    if (plan.create.destination.status !== 'known') continue;
    const countryCode = plan.create.destination.countryCode;
    expect(plan.additionalDestinations.every((stop) => stop.countryCode === countryCode)).toBe(
      true
    );
  }
  expect(
    plans.find((plan) => plan.create.currency === 'JPY')?.create.budget?.amount
  ).toBeGreaterThan(100000);
  expect(plans.some((plan) => plan.create.startDate !== undefined)).toBe(true);
  expect(plans.every((plan) => plan.create.clientRequestId.startsWith('seed:v2:'))).toBe(true);
});
