import { expect, test } from 'vite-plus/test';
import { MAX_PASSKEY_NAME_LENGTH, MAX_USER_NAME_LENGTH } from './lengths';
import { lengthViolation } from './limits';

const long = (length: number) => 'a'.repeat(length + 1);

test('rejects an over-long display name on sign-up and profile updates', () => {
  for (const path of ['/sign-up/email', '/update-user'])
    expect(lengthViolation(path, { body: { name: long(MAX_USER_NAME_LENGTH) } })).toBe(
      `Display name must be ${MAX_USER_NAME_LENGTH} characters or fewer.`
    );
});

test('reads nested group updates and passkey names from the query', () => {
  expect(lengthViolation('/organization/update', { body: { data: { name: long(80) } } })).toMatch(
    /^Group name/u
  );
  expect(
    lengthViolation('/passkey/generate-register-options', {
      query: { name: long(MAX_PASSKEY_NAME_LENGTH) }
    })
  ).toMatch(/^Passkey name/u);
});

test('allows names within the limit, surrounding spaces, and unrelated paths', () => {
  expect(lengthViolation('/sign-up/email', { body: { name: 'Ada' } })).toBeNull();
  expect(
    lengthViolation('/update-user', { body: { name: ` ${'a'.repeat(MAX_USER_NAME_LENGTH)} ` } })
  ).toBeNull();
  expect(lengthViolation('/sign-in/email', { body: { name: long(500) } })).toBeNull();
  expect(lengthViolation(undefined, {})).toBeNull();
});
