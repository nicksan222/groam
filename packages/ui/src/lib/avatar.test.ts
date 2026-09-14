import { describe, expect, test } from 'vitest';
import { avatarClasses, displayInitials, initials } from './avatar';

describe('initials', () => {
  test.each([
    ['Ada Lovelace', 'AL'],
    ['Grace Brewster Murray Hopper', 'GB'],
    ['prince', 'P']
  ])('turns %j into %j', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  test('uses the fallback for missing names', () => {
    expect(initials(null, '?')).toBe('?');
    expect(initials('  ', '?')).toBe('?');
  });
});

test('avatarClasses is stable', () => {
  expect(avatarClasses('Groam Demo')).toBe(avatarClasses('Groam Demo'));
});

describe('displayInitials', () => {
  test('uses two letters for a single name', () => {
    expect(displayInitials('Alex')).toBe('AL');
  });

  test('uses first letters for first and last name', () => {
    expect(displayInitials('Alex Morgan')).toBe('AM');
  });

  test('ignores extra whitespace', () => {
    expect(displayInitials('  Jordan   Lee  ')).toBe('JL');
  });

  test('falls back for empty names', () => {
    expect(displayInitials('')).toBe('?');
    expect(displayInitials('   ')).toBe('?');
  });
});
