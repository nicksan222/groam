export const seedScales = ['small', 'realistic', 'large'] as const;
export type SeedScale = (typeof seedScales)[number];

export type SeedScenario = {
  concurrency: number;
  tripCount: number;
  userCount: number;
};

const presets: Record<SeedScale, SeedScenario> = {
  large: { concurrency: 12, tripCount: 150, userCount: 80 },
  realistic: { concurrency: 8, tripCount: 40, userCount: 30 },
  small: { concurrency: 8, tripCount: 8, userCount: 6 }
};

export type SeedScenarioOverrides = {
  concurrency?: number;
  scale: SeedScale;
  tripCount?: number;
  userCount?: number;
};

function boundedInteger(value: number, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}`);
  }
  return value;
}

export function resolveSeedScenario({
  concurrency,
  scale,
  tripCount,
  userCount
}: SeedScenarioOverrides): SeedScenario {
  const preset = presets[scale];
  const resolvedTripCount = boundedInteger(tripCount ?? preset.tripCount, 'Trip count', 0, 1000);
  const resolvedUserCount = boundedInteger(userCount ?? preset.userCount, 'User count', 1, 100);
  if (resolvedUserCount < 2 && resolvedTripCount > 0) {
    throw new Error('Trip seeding requires at least 2 users');
  }
  return {
    concurrency: boundedInteger(concurrency ?? preset.concurrency, 'Concurrency', 1, 20),
    tripCount: resolvedTripCount,
    userCount: resolvedUserCount
  };
}
