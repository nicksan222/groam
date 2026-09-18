import { describe, expect, test } from 'vitest';
import { isValidUsername } from './username';

describe('isValidUsername', () => {
  test.each(['abc', 'travel_planner', 'first.last', 'A1_2.3'])('accepts %s', (username) => {
    expect(isValidUsername(username)).toBe(true);
  });

  test.each(['ab', 'a'.repeat(31), 'not valid', 'traveler@example.com', 'élise'])(
    'rejects %s',
    (username) => {
      expect(isValidUsername(username)).toBe(false);
    }
  );
});
