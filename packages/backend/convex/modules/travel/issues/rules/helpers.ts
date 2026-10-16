import { ConvexError } from 'convex/values';
import type {
  ClauseResult,
  RuleComparator,
  RuleFacts
} from '#convex/modules/travel/issues/rules/types';
import { tripDurationDays } from '#convex/modules/travel/trips/duration';

export const MAX_RULE_DAY = 365;
export const MAX_RULE_COUNT = 200;
export const MAX_RULE_AMOUNT = 10_000_000;
export const MAX_RULE_TEXT_LENGTH = 60;
const MAX_LISTED = 5;

export const comparatorWords: Record<RuleComparator, string> = {
  at_least: 'at least',
  at_most: 'at most',
  exactly: 'exactly'
};

export function compare(
  { comparator, count }: { comparator: RuleComparator; count: number },
  value: number
): boolean {
  switch (comparator) {
    case 'at_least': {
      return value >= count;
    }
    case 'at_most': {
      return value <= count;
    }
    case 'exactly': {
      return value === count;
    }
  }
}

/** "at least 2 activities", "exactly 1 stay". */
export function quantity(
  { comparator, count }: { comparator: RuleComparator; count: number },
  noun: string,
  plural = `${noun}s`
): string {
  return `${comparatorWords[comparator]} ${count} ${count === 1 ? noun : plural}`;
}

const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatAmount(amount: number): string {
  return amountFormat.format(amount);
}

/** A count clause's answer, with what the trip has so far when it is not met. */
export function counted(
  clause: { comparator: RuleComparator; count: number },
  value: number
): ClauseResult {
  const met = compare(clause, value);
  return { detail: met ? null : `${value} so far`, met };
}

export function wholeNumber(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ConvexError(`${label} must be a whole number from ${minimum} to ${maximum}`);
  }
  return value;
}

export function normalizeCount<C extends { count: number }>(clause: C, label: string): C {
  return { ...clause, count: wholeNumber(clause.count, 0, MAX_RULE_COUNT, label) };
}

export function normalizeAmount<C extends { amount: number }>(clause: C): C {
  if (!Number.isFinite(clause.amount) || clause.amount < 0 || clause.amount > MAX_RULE_AMOUNT) {
    throw new ConvexError(`Amounts must be from 0 to ${formatAmount(MAX_RULE_AMOUNT)}`);
  }
  return { ...clause, amount: Math.round(clause.amount * 100) / 100 };
}

/** Required text: trimmed, 1 to `MAX_RULE_TEXT_LENGTH` characters. */
export function requiredText(value: string, label: string): string {
  const text = value.trim();
  if (text.length === 0 || text.length > MAX_RULE_TEXT_LENGTH) {
    throw new ConvexError(`${label} must contain 1 to ${MAX_RULE_TEXT_LENGTH} characters`);
  }
  return text;
}

/** Optional text: blank becomes undefined. */
export function optionalText(value: string | undefined, label: string): string | undefined {
  const text = value?.trim();
  return text ? requiredText(text, label) : undefined;
}

export type DayRange = { from: number; to: number };

export function normalizeRange(range: DayRange | undefined, unit: 'day' | 'night') {
  if (range === undefined) return undefined;
  const from = wholeNumber(range.from, 1, MAX_RULE_DAY, `First ${unit}`);
  const to = wholeNumber(range.to, 1, MAX_RULE_DAY, `Last ${unit}`);
  if (from > to) throw new ConvexError(`The first ${unit} must come before the last ${unit}`);
  return { from, to };
}

/** "Day 2", "Days 1–3"; `unit` capitalized. */
export function rangeWords(range: DayRange, unit: 'Day' | 'Night'): string {
  return range.from === range.to ? `${unit} ${range.from}` : `${unit}s ${range.from}–${range.to}`;
}

export function tripDays(facts: Pick<RuleFacts, 'trip'>): number | undefined {
  return tripDurationDays(facts.trip);
}

/** Days `from..to`; without a range, the whole trip, or undefined when its length is unknown. */
export function daysIn(range: DayRange | undefined, last: number | undefined) {
  const to = range?.to ?? last;
  if (to === undefined) return undefined;
  const days: Array<number> = [];
  for (let day = range?.from ?? 1; day <= to; day += 1) days.push(day);
  return days;
}

/** "Day 2", "days 2, 4", or "7 days", for a detail line. */
export function listed(numbers: Array<number>, unit: 'day' | 'night'): string {
  if (numbers.length === 1) return `${unit} ${numbers[0]}`;
  if (numbers.length > MAX_LISTED) return `${numbers.length} ${unit}s`;
  return `${unit}s ${numbers.join(', ')}`;
}

/**
 * "Every X has Y" clauses: unmet while there is no X yet, so an empty trip does not settle them.
 */
export function everyHas<T>(
  items: Array<T>,
  has: (item: T) => boolean,
  nouns: { missing: string; none: string }
): ClauseResult {
  if (items.length === 0) return { detail: nouns.none, met: false };
  const missing = items.filter((item) => !has(item)).length;
  return missing === 0
    ? { detail: null, met: true }
    : { detail: `${missing} ${nouns.missing}`, met: false };
}

export function filled(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}
