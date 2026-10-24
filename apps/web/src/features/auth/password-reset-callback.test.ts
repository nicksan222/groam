import { expect, test } from 'vite-plus/test';
import { passwordResetCallback } from './password-reset-callback';

test.each([
  ['?auth=reset-password&token=reset-token', { token: 'reset-token' }],
  ['?auth=reset-password&error=INVALID_TOKEN', { token: null }],
  ['?token=unmarked-token', null],
  ['', null]
])('parses %j', (search, expected) => {
  expect(passwordResetCallback(search)).toEqual(expected);
});
