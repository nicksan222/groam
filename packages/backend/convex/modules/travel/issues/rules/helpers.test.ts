import { expect, test } from 'vite-plus/test';
import {
  detailField,
  everyHas,
  filled,
  formatAmount,
  listed,
  MAX_RULE_TEXT_LENGTH,
  met,
  optionalText,
  presence,
  requiredText,
  tripDayList,
  unmet,
  wholeNumber
} from '#convex/modules/travel/issues/rules/helpers';

test('met, unmet, and presence build clause results', () => {
  expect(met).toEqual({ detail: null, met: true });
  expect(unmet('Nothing yet')).toEqual({ detail: 'Nothing yet', met: false });
  expect(presence(true, 'x')).toBe(met);
  expect(presence(false, 'No dates')).toEqual({ detail: 'No dates', met: false });
});

test('everyHas stays unmet on an empty list and counts what is missing', () => {
  const nouns = { missing: 'days without plans', none: 'No days yet' };
  expect(everyHas([], () => true, nouns)).toEqual(unmet('No days yet'));
  expect(everyHas([1, 2], () => true, nouns)).toBe(met);
  expect(everyHas([1, 2, 3], (n) => n === 2, nouns)).toEqual(unmet('2 days without plans'));
});

test('wholeNumber accepts the inclusive range and rejects the rest', () => {
  expect(wholeNumber(1, 1, 5, 'Count')).toBe(1);
  expect(wholeNumber(5, 1, 5, 'Count')).toBe(5);
  for (const bad of [0, 6, 2.5, Number.NaN]) {
    expect(() => wholeNumber(bad, 1, 5, 'Count')).toThrow(
      'Count must be a whole number from 1 to 5'
    );
  }
});

test('requiredText trims and bounds', () => {
  expect(requiredText('  Lisbon ', 'Name')).toBe('Lisbon');
  expect(requiredText('a'.repeat(MAX_RULE_TEXT_LENGTH), 'Name')).toHaveLength(MAX_RULE_TEXT_LENGTH);
  expect(() => requiredText('   ', 'Name')).toThrow('Name must contain 1 to 60 characters');
  expect(() => requiredText('a'.repeat(MAX_RULE_TEXT_LENGTH + 1), 'Name')).toThrow(
    'Name must contain 1 to 60 characters'
  );
});

test('optionalText turns blank into undefined and otherwise validates', () => {
  expect(optionalText(undefined, 'Note')).toBeUndefined();
  expect(optionalText('  ', 'Note')).toBeUndefined();
  expect(optionalText(' hi ', 'Note')).toBe('hi');
  expect(() => optionalText('a'.repeat(MAX_RULE_TEXT_LENGTH + 1), 'Note')).toThrow('Note must');
});

test('tripDayList counts days 1..last', () => {
  expect(tripDayList(undefined)).toBeUndefined();
  expect(tripDayList(0)).toEqual([]);
  expect(tripDayList(3)).toEqual([1, 2, 3]);
});

test('listed words one, a few, and many numbers', () => {
  expect(listed([2], 'day')).toBe('day 2');
  expect(listed([2, 4], 'night')).toBe('nights 2, 4');
  expect(listed([1, 2, 3, 4, 5], 'day')).toBe('days 1, 2, 3, 4, 5');
  expect(listed([1, 2, 3, 4, 5, 6, 7], 'day')).toBe('7 days');
});

test('formatAmount groups digits and caps decimals', () => {
  expect(formatAmount(1234.567)).toBe('1,234.57');
  expect(formatAmount(10)).toBe('10');
});

test('filled ignores undefined and whitespace', () => {
  expect(filled(undefined)).toBe(false);
  expect(filled('  ')).toBe(false);
  expect(filled(' a ')).toBe(true);
});

test('detailField offers the "has" wording as choices', () => {
  expect(
    detailField({
      cost: { has: 'a cost', missing: 'no cost' },
      notes: { has: 'notes', missing: 'no notes' }
    })
  ).toEqual({
    key: 'field',
    label: 'Detail',
    lead: 'with',
    options: { cost: 'a cost', notes: 'notes' },
    type: 'choice'
  });
});
