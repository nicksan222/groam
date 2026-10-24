import { describe, expect, test } from 'vite-plus/test';
import { buildTripPlan } from './build-trip-plan';
import { buildCast } from './seed-cast';
import { seedGroups } from './seed-groups';

describe('seed cast and groups', () => {
  const cast = buildCast({ email: 'demo@example.com', name: 'Demo', password: 'pw' });

  test('has five distinct people with Elena as the owner', () => {
    expect(cast.size).toBe(5);
    expect(new Set([...cast.values()].map(({ email }) => email)).size).toBe(5);
    expect(cast.get('elena')).toEqual({
      email: 'demo@example.com',
      name: 'Elena Marchetti',
      password: 'pw'
    });
  });

  test('has two groups of three trips whose members all exist', () => {
    expect(seedGroups).toHaveLength(2);
    for (const group of seedGroups) {
      expect(group.trips).toHaveLength(3);
      for (const key of [group.owner, ...group.members]) expect(cast.has(key)).toBe(true);
    }
  });

  test('uses unique trip keys and activity titles per stop', () => {
    const trips = seedGroups.flatMap(({ trips }) => trips);
    expect(new Set(trips.map(({ key }) => key)).size).toBe(trips.length);
    for (const trip of trips) {
      const titles = trip.activities.map(({ stop, title }) => `${stop}:${title}`);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  test('keeps activities inside their stop and leaves gaps in each active trip', () => {
    for (const trip of seedGroups.flatMap(({ trips }) => trips)) {
      const slots = new Set<string>();
      for (const { block, day, stop } of trip.activities) {
        const range = trip.stops[stop];
        expect(range, `${trip.key} stop ${stop}`).toBeDefined();
        expect(day).toBeGreaterThanOrEqual(range?.firstDay ?? 0);
        expect(day).toBeLessThanOrEqual(range?.lastDay ?? 0);
        slots.add(`${day}:${block}`);
      }
      // Three daytime blocks per day: a fully planned trip would fill them all.
      expect(slots.size).toBeLessThan(trip.totalDays * 3);
    }
  });

  test('builds plans with the first stop as the destination', () => {
    const [group] = seedGroups;
    const trip = group?.trips[0];
    if (!trip) throw new Error('missing trip');
    const plan = buildTripPlan(trip);
    expect(plan.create.destination).toMatchObject({ name: trip.stops[0]?.name, status: 'known' });
    expect(plan.additionalDestinations).toHaveLength(trip.stops.length - 1);
  });
});
