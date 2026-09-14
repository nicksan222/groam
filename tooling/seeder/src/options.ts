import { type SeedScale, seedScales } from './seed-scenario';

export type SeedCliOptions = {
  concurrency?: number;
  reset: boolean;
  scale: SeedScale;
  tripCount?: number;
  userCount?: number;
};

export type ParsedSeedOptions = SeedCliOptions | { help: true };

type CollectedArguments = {
  flags: Set<string>;
  values: Map<string, string>;
};

const booleanFlags = new Set(['--help', '--no-reset', '-h']);
const valueFlags = new Set(['--concurrency', '--scale', '--trips', '--users']);

const optionRanges = {
  '--concurrency': { label: 'Concurrency', maximum: 20, minimum: 1 },
  '--trips': { label: 'Trip count', maximum: 1000, minimum: 0 },
  '--users': { label: 'User count', maximum: 100, minimum: 1 }
} as const;

export const seedUsage = `Realistic local Convex and Better Auth development seeding.

Usage:
  bun seed -- [options]

Options:
  --scale small|realistic|large   Deterministic scenario preset (default: realistic)
  --users <1-100>                 Override total users, including the demo owner
  --trips <0-1000>                Override trip count. 0 seeds only workspace users
  --concurrency <1-20>            Bound simultaneous auth and Convex requests
  --no-reset                      Reuse existing Groam Demo users/trips by identity
  --help, -h                      Show this help
`;

function integer(value: string, flag: string): number {
  if (!/^\d+$/u.test(value)) throw new Error(`${flag} requires a whole number`);
  return Number(value);
}

function collectEqualsOption(argument: string, values: Map<string, string>): boolean {
  const separator = argument.indexOf('=');
  if (separator < 1) return false;
  const flag = argument.slice(0, separator);
  if (!valueFlags.has(flag)) throw new Error(`Unknown seeder option: ${flag}`);
  values.set(flag, argument.slice(separator + 1));
  return true;
}

function collectArguments(args: readonly string[]): CollectedArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith('--') && argument !== '-h') {
      throw new Error(`Unknown seeder argument: ${argument}`);
    }
    if (argument && collectEqualsOption(argument, values)) continue;
    if (argument && booleanFlags.has(argument)) {
      flags.add(argument);
      continue;
    }
    if (!argument || !valueFlags.has(argument)) {
      throw new Error(`Unknown seeder option: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
    values.set(argument, value);
    index += 1;
  }
  return { flags, values };
}

function optionalBoundedInteger(
  values: Map<string, string>,
  flag: keyof typeof optionRanges
): number | undefined {
  const value = values.get(flag);
  if (value === undefined) return undefined;
  const parsed = integer(value, flag);
  const { label, maximum, minimum } = optionRanges[flag];
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseScale(values: Map<string, string>): SeedScale {
  const value = values.get('--scale') ?? 'realistic';
  const scale = seedScales.find((candidate) => candidate === value);
  if (!scale) throw new Error(`--scale must be one of: ${seedScales.join(', ')}`);
  return scale;
}

export function parseSeedOptions(args: readonly string[]): ParsedSeedOptions {
  const { flags, values } = collectArguments(args);
  if (flags.has('--help') || flags.has('-h')) return { help: true };
  const concurrency = optionalBoundedInteger(values, '--concurrency');
  const tripCount = optionalBoundedInteger(values, '--trips');
  const userCount = optionalBoundedInteger(values, '--users');
  return {
    ...(concurrency === undefined ? {} : { concurrency }),
    reset: !flags.has('--no-reset'),
    scale: parseScale(values),
    ...(tripCount === undefined ? {} : { tripCount }),
    ...(userCount === undefined ? {} : { userCount })
  };
}
