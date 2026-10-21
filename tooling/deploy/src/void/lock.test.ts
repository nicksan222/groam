import { expect, test } from 'vite-plus/test';
import { assertVoidLock } from '#src/void/lock';

test('environment locks must match both Worker identity and account before any publishing', () => {
  const lock = (source: object, resolved = source) =>
    JSON.stringify({ version: 1, source, resolved });
  expect(() =>
    assertVoidLock(lock({ name: 'groam-app-beta' }), 'groam-app-beta', 'account')
  ).not.toThrow();
  expect(() => assertVoidLock(lock({ name: 'groam-app' }), 'groam-app-beta', 'account')).toThrow();
  expect(() =>
    assertVoidLock(
      lock({ name: 'groam-app-beta', account_id: 'other' }),
      'groam-app-beta',
      'account'
    )
  ).toThrow();
  expect(() =>
    assertVoidLock(
      lock({ name: 'groam-app-beta' }, { name: 'groam-app' }),
      'groam-app-beta',
      'account'
    )
  ).toThrow();
});

test('skips the account check when the environment does not pin one', () => {
  const lock = JSON.stringify({
    version: 1,
    source: { name: 'groam-app', account_id: 'other' },
    resolved: { name: 'groam-app', account_id: 'other' }
  });
  expect(() => assertVoidLock(lock, 'groam-app', '')).not.toThrow();
});
