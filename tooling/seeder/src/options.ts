export type SeedCliOptions = {
  concurrency?: number;
  reset: boolean;
};

export type ParsedSeedOptions = SeedCliOptions | { help: true };

type CollectedArguments = {
  flags: Set<string>;
  values: Map<string, string>;
};

const booleanFlags = new Set(['--help', '--no-reset', '-h']);
const valueFlags = new Set(['--concurrency']);

const optionRanges = {
  '--concurrency': { label: 'Concurrency', maximum: 20, minimum: 1 }
} as const;

export const seedUsage = `Realistic local Convex and Better Auth development seeding: five travelers, two
groups, and three trips each (Milan, Rome, London).

Usage:
  bun seed -- [options]

Options:
  --concurrency <1-20>            Bound simultaneous auth and Convex requests
  --no-reset                      Reuse existing users, groups and trips by identity
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
    index += collectArgument(args, index, flags, values);
  }
  return { flags, values };
}

function collectArgument(
  args: readonly string[],
  index: number,
  flags: Set<string>,
  values: Map<string, string>
): number {
  const argument = args[index];
  if (!argument?.startsWith('--') && argument !== '-h') {
    throw new Error(`Unknown seeder argument: ${argument}`);
  }
  if (collectEqualsOption(argument, values)) return 0;
  if (booleanFlags.has(argument)) {
    flags.add(argument);
    return 0;
  }
  if (!valueFlags.has(argument)) throw new Error(`Unknown seeder option: ${argument}`);
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
  values.set(argument, value);
  return 1;
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

export function parseSeedOptions(args: readonly string[]): ParsedSeedOptions {
  const { flags, values } = collectArguments(args);
  if (flags.has('--help') || flags.has('-h')) return { help: true };
  const concurrency = optionalBoundedInteger(values, '--concurrency');
  return {
    ...(concurrency === undefined ? {} : { concurrency }),
    reset: !flags.has('--no-reset')
  };
}
