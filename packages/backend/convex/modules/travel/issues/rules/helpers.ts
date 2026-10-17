import { ConvexError } from 'convex/values';
import type {
  ClauseField,
  ClauseResult,
  RuleFacts
} from '#convex/modules/travel/issues/rules/types';
import { tripDurationDays } from '#convex/modules/travel/trips/duration';

export const MAX_RULE_COUNT = 200;
export const MAX_RULE_TEXT_LENGTH = 60;
const MAX_LISTED = 5;

const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatAmount(amount: number): string {
  return amountFormat.format(amount);
}

export function wholeNumber(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ConvexError(`${label} must be a whole number from ${minimum} to ${maximum}`);
  }
  return value;
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

export function tripDays(facts: Pick<RuleFacts, 'trip'>): number | undefined {
  return tripDurationDays(facts.trip);
}

/** Days `1..last`, or undefined when the trip length is unknown. */
export function tripDayList(last: number | undefined) {
  if (last === undefined) return undefined;
  const days: Array<number> = [];
  for (let day = 1; day <= last; day += 1) days.push(day);
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
  if (items.length === 0) return unmet(nouns.none);
  const missing = items.filter((item) => !has(item)).length;
  return missing === 0 ? met : unmet(`${missing} ${nouns.missing}`);
}

/** A clause that holds: nothing is missing, so there is no detail. */
export const met: ClauseResult = { detail: null, met: true };

/** A clause that does not hold yet, with what is missing. */
export function unmet(detail: string): ClauseResult {
  return { detail, met: false };
}

/** A "has X yet" clause: met when `present`, otherwise unmet with `detail`. */
export function presence(present: boolean, detail: string): ClauseResult {
  return present ? met : unmet(detail);
}

/** The wording a detailed kind uses for each detail it can ask about. */
export type DetailWording<Detail extends string> = Record<Detail, { has: string; missing: string }>;

/** The "with ..." picker shared by the detailed kinds, worded from `wording`. */
export function detailField(wording: DetailWording<string>): ClauseField<'field'> {
  return {
    key: 'field',
    label: 'Detail',
    lead: 'with',
    options: Object.fromEntries(Object.entries(wording).map(([key, { has }]) => [key, has])),
    type: 'choice'
  };
}

export function filled(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}
