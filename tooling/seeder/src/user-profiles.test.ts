import { describe, expect, test } from 'vitest';
import { buildUserProfiles } from './user-profiles';

const owner = {
  email: 'demo@groam.example',
  name: 'Groam Demo',
  password: 'GroamDemo123!'
};

describe('buildUserProfiles', () => {
  test('builds stable unique profiles that share local credentials', () => {
    const first = buildUserProfiles(30, owner);
    const second = buildUserProfiles(30, owner);

    expect(first).toEqual(second);
    expect(first[0]).toEqual(owner);
    expect(new Set(first.map(({ email }) => email)).size).toBe(30);
    expect(first[1]).toMatchObject({
      email: 'traveler.001@groam.example',
      name: 'Avery Morgan',
      password: owner.password
    });
  });
});
