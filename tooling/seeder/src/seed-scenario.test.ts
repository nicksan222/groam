import { describe, expect, test } from 'vitest';
import { resolveSeedScenario } from './seed-scenario';

describe('resolveSeedScenario', () => {
  test('offers useful local data volumes at each scale', () => {
    expect(resolveSeedScenario({ scale: 'small' })).toMatchObject({
      concurrency: 8,
      tripCount: 8,
      userCount: 6
    });
    expect(resolveSeedScenario({ scale: 'realistic' })).toMatchObject({
      concurrency: 1,
      tripCount: 40,
      userCount: 30
    });
    expect(resolveSeedScenario({ scale: 'large' })).toMatchObject({
      tripCount: 150,
      userCount: 80
    });
  });

  test('validates overrides against local workload limits', () => {
    expect(resolveSeedScenario({ scale: 'small', tripCount: 90, userCount: 50 })).toMatchObject({
      tripCount: 90,
      userCount: 50
    });
    expect(resolveSeedScenario({ scale: 'small', tripCount: 0, userCount: 1 })).toMatchObject({
      tripCount: 0,
      userCount: 1
    });
    expect(() => resolveSeedScenario({ scale: 'large', userCount: 101 })).toThrow(
      'User count must be a whole number between 1 and 100'
    );
    expect(() => resolveSeedScenario({ concurrency: 0, scale: 'small' })).toThrow(
      'Concurrency must be a whole number between 1 and 20'
    );
    expect(() => resolveSeedScenario({ scale: 'small', tripCount: -1 })).toThrow(
      'Trip count must be a whole number between 0 and 1000'
    );
    expect(() => resolveSeedScenario({ scale: 'small', tripCount: 1, userCount: 1 })).toThrow(
      'Trip seeding requires at least 2 users'
    );
  });
});
